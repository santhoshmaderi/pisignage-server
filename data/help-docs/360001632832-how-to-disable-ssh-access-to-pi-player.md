# How to disable ssh access to pi player

Source: https://help.pisignage.com/hc/en-us/articles/360001632832-How-to-disable-ssh-access-to-pi-player

A. You can use the following commands to disable the service

- sudo /etc/init.d/ssh stop

- sudo update-rc.d ssh disable

Or alternatively use raspi-config to disable ssh.

B. To change the default password for ssh, you can do so under Server settings Tab as mentioned in this support article.
