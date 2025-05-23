#!/bin/sh
# Force Remove Vnode
# by Ahmed AlGhrbi

rm -rf /var/jb/usr/bin/vnodebypass
rm -rf /var/lib/dpkg/info/kr.xsf1re.vnodebypass.*
rm -rf /Applications/vnodebypass.app
uicache -a
