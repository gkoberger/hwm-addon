import os
import re
import shutil
import sys

from subprocess import Popen, PIPE

class Builder:
    version = 1
    def __init__(self, version):
        self.version = version

    def build(self):
        self.move('main.js');
        self.move('room.js');

        self.move('check.js', False);

        self.move('socket.io.js', False);
        self.move('jquery.js', False);
        self.move('style.css', False);

        self.move('icon16.png', False);
        self.move('icon48.png', False);
        self.move('icon128.png', False);

        # Chrome specific
        self.move('manifest.json', only='chrome')
        shutil.copyfile('src/room-loader.js', 'hwm-chrome/room-loader.js')

        # Firefox specific
        self.move('package.json', only='firefox')

        if os.path.exists('firefox/data/imgs'):
            shutil.rmtree('firefox/data/imgs')
        shutil.copytree('src/imgs', 'firefox/data/imgs')

        if os.path.exists('hwm-chrome/imgs'):
            shutil.rmtree('hwm-chrome/imgs')
        shutil.copytree('src/imgs', 'hwm-chrome/imgs')

        self.build_fx()
        self.build_chrome()

    def build_chrome(self):
        os.chdir('hwm-chrome/')
        p = Popen("zip -r huluwithme_chrome *", shell=True, stdin=PIPE, stdout=PIPE, stderr=PIPE)
        p.communicate()
        os.chdir('..') # back to where we started
        shutil.move('hwm-chrome/huluwithme_chrome.zip', 'huluwithme_chrome.zip')

    def build_fx(self):
        if os.path.exists('addon-sdk/hwm'):
            shutil.rmtree('addon-sdk/hwm')

        shutil.copytree('firefox', 'addon-sdk/hwm')

        os.chdir('addon-sdk/')
        p = Popen("source bin/activate; cfx xpi --pkgdir='hwm'", shell=True, stdin=PIPE, stdout=PIPE, stderr=PIPE)
        os.chdir('..') # back to where we started

    def move(self, fn, fix=True, only=False):
        fx = 'data/'
        fx = 'lib/' if fn == "main.js" else fx
        fx = '' if fn == "package.json" else fx

        if(not fix):
            shutil.copyfile('src/%s' % fn,
                            'hwm-chrome/%s' % fn)
            shutil.copyfile('src/%s' % fn,
                            'firefox/%s%s' % (fx, fn))
        else:
            with open('src/%s' % fn) as o:
                disable_ch = False;
                disable_fx = False;

                firefox_lines = [];
                chrome_lines = [];

                for line in o :
                    meta = False
                    if re.search('STARTFIREFOX', line):
                        disable_ch = True
                        meta = True
                    if re.search('STARTCHROME', line):
                        disable_fx = True
                        meta = True
                    if re.search('ENDFIREFOX', line):
                        disable_ch = False
                        meta = True
                    if re.search('ENDCHROME', line):
                        disable_fx = False
                        meta = True

                    if not disable_fx and not meta:
                        firefox_lines.append(line)

                    if not disable_ch and not meta:
                        chrome_lines.append(line)

                # Chrome
                if only != 'firefox':
                    chrome_fn = 'background.js' if fn == 'main.js' else fn
                    if(os.path.exists(chrome_fn)):
                        os.remove(chrome_fn)
                    with open('hwm-chrome/%s' % chrome_fn, 'w') as bg:
                        text_ch = ''.join(chrome_lines)
                        text_ch = re.sub('{version}', self.version, text_ch)
                        bg.write(re.sub('unsafeWindow', 'window', text_ch))

                # Fx
                if only != 'chrome':
                    firefox_fn = 'firefox/%s%s' % (fx, fn)
                    if(os.path.exists(firefox_fn)):
                        os.remove(firefox_fn)
                    with open(firefox_fn, 'w') as bg:
                        text_fx = ''.join(firefox_lines)
                        text_fx = re.sub('{version}', self.version, text_fx)
                        bg.write(text_fx)

def main(version):
    build = Builder(version)
    build.build()

if __name__ == '__main__':
    version = sys.argv[1] if len(sys.argv) > 1 else '1'
    main(version)

