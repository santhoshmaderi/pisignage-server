# piSignage Player Hardening and Security Best Practices

Source: https://help.pisignage.com/hc/en-us/articles/52199715297817-piSignage-Player-Hardening-and-Security-Best-Practices

This guide outlines a few optional steps to further strengthen the security of your piSignage Raspberry Pi Player. These configurations help reinforce system protection, reduce potential exposure to risks, and ensure your player continues running reliably in production environments.

Download and Install Lynis

wget https://downloads.cisofy.com/lynis/lynis-3.1.6.tar.gz
sudo tar -xzvf lynis-3.1.6.tar.gz
cd lynis/
sudo ./lynis audit system
Update System and Packages

# Update package database and system
sudo apt update && sudo apt upgrade -y

# Enable automatic security updates
sudo apt install unattended-upgrades

# Enable unattended upgrades and daily package list updates
sudo sh -c 'echo "APT::Periodic::Update-Package-Lists \"1\";" > /etc/apt/apt.conf.d/20auto-upgrades'
sudo sh -c 'echo "APT::Periodic::Unattended-Upgrade \"1\";" >> /etc/apt/apt.conf.d/20auto-upgrades'
sudo systemctl enable --now unattended-upgrades

# Configure automatic updates
sudo vi /etc/apt/apt.conf.d/50unattended-upgrades

Add following lines

Unattended-Upgrade::Automatic-Reboot "false";
Unattended-Upgrade::Automatic-Reboot-Time "02:00";
Unattended-Upgrade::Remove-Unused-Dependencies "true";

Disable Unused Accounts

# List all accounts
cat /etc/passwd

# Disable unused system accounts
sudo usermod -s /bin/false games
sudo usermod -s /bin/false news
sudo usermod -s /bin/false uucp

# Lock unused accounts
sudo passwd -l games
sudo passwd -l news

Service Hardening and Optimization

# Disable unneeded background services
sudo systemctl disable bluetooth
sudo systemctl disable avahi-daemon
sudo systemctl disable triggerhappy
sudo systemctl disable dphys-swapfile # Only if using ZRAM or no swap file

sudo systemctl stop bluetooth
sudo systemctl stop avahi-daemon

# Disable additional non-essential services (ignore errors if not installed)
sudo systemctl disable avahi-daemon.service 2>/dev/null || true
sudo systemctl disable bluetooth.service 2>/dev/null || true
sudo systemctl disable cups.service 2>/dev/null || true
sudo systemctl disable cups-browsed.service 2>/dev/null || true
sudo systemctl disable packagekit.service 2>/dev/null || true
sudo systemctl disable udisks2.service 2>/dev/null || true
sudo systemctl disable upower.service 2>/dev/null || true

Reload systemctl again

sudo systemctl daemon-reload
sudo systemctl reset-fa

Disable Core Dumps (Memory Dump Protection)

sudo tee -a /etc/security/limits.conf > /dev/null << 'EOF'
* hard core 0
* soft core 0
EOF

Secure SSH Access Configuration

File to Modify
/etc/ssh/sshd_config

Parameters to Add or Update

Port 2022
PermitRootLogin no
AllowUsers pi
AllowTcpForwarding no
GatewayPorts no
PermitTunnel no
ClientAliveCountMax 2
Compression no
X11Forwarding no
MaxAuthTries 3
MaxSessions 2
TCPKeepAlive no
AllowAgentForwarding no
LogLevel VERBOSE

 

These SSH settings improve security by:

-
Moving the SSH service to a non-standard port (2022) and disabling root login to reduce brute-force attempts.

-
Restricting access to the specific user pi and limiting authentication attempts and sessions.

-
Disabling port forwarding, tunneling, X11, and agent forwarding to prevent SSH misuse as a relay or proxy.

-
Enabling verbose logging to enhance auditing and traceability of connection attempts.

Apply Changes

sudo systemctl restart ssh

Kernel Hardening Configuration

Create new file /etc/sysctl.d/99-player2-kernel-hardening.conf

Parameters to Add or Verify

# TTY Security
dev.tty.ldisc_autoload = 0

# File System Protection
fs.protected_fifos = 2
kernel.core_uses_pid = 1

# Kernel Security
kernel.dmesg_restrict = 1
kernel.kptr_restrict = 2
kernel.sysrq = 0
kernel.unprivileged_bpf_disabled = 1
kernel.randomize_va_space = 2

# IPv4 Network Security
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1
net.ipv4.conf.all.log_martians = 1
net.ipv4.conf.default.log_martians = 1
net.ipv4.icmp_echo_ignore_broadcasts = 1
net.ipv4.icmp_ignore_bogus_error_responses = 1
net.ipv4.tcp_syncookies = 1

# IPv6 Network Security
net.ipv6.conf.all.accept_redirects = 0
net.ipv6.conf.default.accept_redirects = 0
net.ipv6.conf.all.accept_ra = 0
net.ipv6.conf.default.accept_ra = 0
net.ipv6.conf.all.accept_source_route = 0
net.ipv6.conf.default.accept_source_route = 0

# BPF Hardening
net.core.bpf_jit_harden = 2

Apply

sudo sysctl --system

Disable Uncommon and Unused Network Protocols

# Disable uncommon and unused network protocols
sudo tee /etc/modprobe.d/blacklist-uncommon-protocols.conf > /dev/null << 'EOF'
blacklist dccp
install dccp /bin/false

blacklist sctp
install sctp /bin/false

blacklist rds
install rds /bin/false

blacklist tipc
install tipc /bin/false
EOF

# Unload modules if currently active
sudo modprobe -r dccp sctp rds tipc 2>/dev/null || true

echo "Protocols disabled. Reboot to apply permanently."

Package Cleanup and Purging

# Clean up unused and obsolete packages
sudo apt autoclean

# Remove unused dependencies and purge configurations
sudo apt autoremove --purge -y

# Clear the local package cache
sudo apt clean

# Final check and additional cleanup
sudo apt autoremove -y

# Identify any residual (removed but not purged) packages
dpkg -l | awk '/^rc/'

# Example: remove unnecessary package
sudo apt remove firefox

# Re-check for residual configuration files
dpkg -l | awk '/^rc/'

Add Legal Login Banner

Files to Modify

/etc/issue

/etc/issue.net
 

sudo tee /etc/issue > /dev/null << 'EOF'
*************************************************************
WARNING: This system is for the use of authorized users only.
Unauthorized access is strictly prohibited and subject to
prosecution under applicable laws. All activity may be logged
and monitored.
*************************************************************
EOF

sudo tee /etc/issue.net > /dev/null << 'EOF'
*************************************************************
WARNING: This system is for the use of authorized users only.
Unauthorized access is strictly prohibited and subject to
prosecution under applicable laws. All activity may be logged
and monitored.
*************************************************************
EOF

Secure Critical Configuration File Permissions

# Verify current permissions
sudo ls -tlr /etc/crontab

# Restrict access to crontab and SSH configuration files
sudo chmod 600 /etc/crontab
sudo chmod 600 /etc/ssh/sshd_config

# Secure cron directories to allow only root access
sudo chmod 700 /etc/cron.d
sudo chmod 700 /etc/cron.daily/
sudo chmod 700 /etc/cron.hourly/
sudo chmod 700 /etc/cron.weekly/
sudo chmod 700 /etc/cron.monthly/

# Verify permissions
sudo ls -ltrd /etc/cron.* /etc/cron.d
 

Install and Enable Additional Security Tools

To further strengthen the Raspberry Pi system and improve monitoring, auditing, and threat detection, install and enable the following tools.

1. Install and Enable sysstat

sudo apt install sysstat -y
sudo sed -i 's/ENABLED="false"/ENABLED="true"/' /etc/default/sysstat
sudo systemctl enable --now sysstat

Purpose:
sysstat provides tools like sar and iostat for system activity and performance monitoring.
Enabling it ensures continuous collection of CPU, memory, and disk usage metrics.

2. Install apt-show-versions

sudo apt install apt-show-versions -y

Purpose:
apt-show-versions helps in package and patch management by listing all installed package versions and available updates.
Useful for regular maintenance and update verification.

3. Install and Enable auditd

sudo apt install auditd audispd-plugins -y
sudo systemctl enable --now auditd

Purpose:
auditd logs all security-related system activities such as logins, file modifications, and privilege changes.
It’s a core Linux auditing component for compliance and intrusion detection.

4. Install and Initialize rkhunter

sudo apt install rkhunter -y
sudo rkhunter --propupd

Purpose:
rkhunter (Rootkit Hunter) detects rootkits, hidden files, and potential backdoors.
Running --propupd initializes the database for future integrity checks.

 

Install and Configure PAM Password-Strength Module

 

Step 1: Install the PAM Password Quality Module

Run the following command:

sudo apt install libpam-pwquality
 

Step 2: Apply System-Wide Defaults

Open the PAM password quality configuration file:

sudo nano /etc/security/pwquality.conf

Add or update the following lines:

minlen = 12
difok = 3
ucredit = -1
lcredit = -1
dcredit = -1
ocredit = -1
retry = 3
 

Enforces password rules: minlen=12 (minimum 12 characters), difok=3 (at least 3 characters different from old password), ucredit=-1 (one uppercase), lcredit=-1 (one lowercase), dcredit=-1 (one digit), ocredit=-1 (one special character), and retry=3 (up to 3 attempts).

 

Steps 3: Change to a Stronger Password

Log in to pisignage.com → Go to Settings → Locate Password 

Adjust it as per your organization’s security requirements and update your password accordingly.

 

Verification

After completing all the above hardening steps, rerun Lynis to verify the system score and confirm that security suggestions have been resolved.

sudo ./lynis audit system
