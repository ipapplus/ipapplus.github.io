if [ ! -e /var/tmp/com.apple.appstored ]; then
    touch /var/tmp/com.apple.appstored
fi

chown 501:0 /var/tmp/com.apple.appstored
chmod 700 /var/tmp/com.apple.appstored