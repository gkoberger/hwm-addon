import os
import re
import shutil

from subprocess import Popen, PIPE

def main():
    move('main.js');
    move('room.js');

    move('check.js', False);

    move('socket.io.js', False);
    move('jquery.js', False);
    move('style.css', False);

    # Chrome specific
    shutil.copyfile('src/manifest.json', 'chrome/manifest.json')
    shutil.copyfile('src/room-loader.js', 'chrome/room-loader.js')

    # Firefox specific
    shutil.copyfile('src/package.json', 'firefox/package.json')

    if os.path.exists('firefox/data/imgs'):
        shutil.rmtree('firefox/data/imgs')
    shutil.copytree('src/imgs', 'firefox/data/imgs')

    if os.path.exists('chrome/imgs'):
        shutil.rmtree('chrome/imgs')
    shutil.copytree('src/imgs', 'chrome/imgs')

    build_fx()

def build_fx():
        if os.path.exists('addon-sdk/hwm'):
            shutil.rmtree('addon-sdk/hwm')

        shutil.copytree('firefox', 'addon-sdk/hwm')

        os.chdir('addon-sdk/')
        p = Popen("source bin/activate; cfx xpi --pkgdir='hwm'", shell=True, stdin=PIPE, stdout=PIPE, stderr=PIPE)
        os.chdir('..') # back to where we started

def move(fn, fix=True):
    fx = 'lib' if fn == "main.js" else 'data'

    if(not fix):
        shutil.copyfile('src/%s' % fn,
                        'chrome/%s' % fn)
        shutil.copyfile('src/%s' % fn,
                        'firefox/%s/%s' % (fx, fn))
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
            chrome_fn = 'background.js' if fn == 'main.js' else fn
            if(os.path.exists(chrome_fn)):
                os.remove(chrome_fn)
            with open('chrome/%s' % chrome_fn, 'w') as bg:
                text_ch = ''.join(chrome_lines)
                bg.write(re.sub('unsafeWindow', 'window', text_ch))

            # Fx
            firefox_fn = 'firefox/%s/%s' % (fx, fn)
            if(os.path.exists(firefox_fn)):
                os.remove(firefox_fn)
            with open(firefox_fn, 'w') as bg:
                bg.write(''.join(firefox_lines))

if __name__ == '__main__':
    main()


