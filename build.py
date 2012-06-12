import re
import shutil

def main():
    move('main.js');
    move('room.js');

    move('check.js', False);

    move('socket.io.js', False);
    move('jquery.js', False);
    move('style.css', False);

    shutil.copyfile('src/manifest.json', 'chrome/manifest.json')
    shutil.copyfile('src/room-loader.js', 'chrome/room-loader.js')

def move(fn, fix=True):
    if(not fix):
        shutil.copyfile('src/%s' % fn,
                        'chrome/%s' % fn)
        shutil.copyfile('src/%s' % fn,
                        'firefox/%s' % fn)
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

            with open('chrome/%s' % fn, 'w') as bg:
                bg.write(''.join(chrome_lines))

            with open('firefox/%s' % fn, 'w') as bg:
                bg.write(''.join(firefox_lines))

if __name__ == '__main__':
    main()


