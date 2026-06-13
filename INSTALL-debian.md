# Installing pisignage-server (open-source) on Debian

Branch: **`es6-mongodb8`** · Node **20 LTS** · MongoDB **8.0** · serves the v2 React UI at `/`.

Tested on Debian 13 "trixie" (x86_64), Node v20.20.2, MongoDB 8.0.26. Run as a
normal user (`pi`) with `sudo`; do **not** run the server itself as root.

---

## 1. System packages
```bash
sudo apt-get update
sudo apt-get install -y git curl build-essential ffmpeg imagemagick
```
- **ffmpeg** — video probe/transcode/thumbnails.
- **imagemagick** — provides the `convert` binary the server calls for image
  thumbnails (the code uses `gm.subClass({ imageMagick: true })`). Installing
  *graphicsmagick* alone is **not** enough — you'll still get `convert: not found`.

## 2. Node.js 20 LTS (NodeSource)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v        # v20.x
```

## 3. MongoDB 8.0
```bash
sudo apt-get install -y gnupg curl
curl -fsSL https://pgp.mongodb.com/server-8.0.asc | \
  sudo gpg -o /usr/share/keyrings/mongodb-server-8.0.gpg --dearmor

echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/debian bookworm/mongodb-org/8.0 main" \
  | sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list

sudo apt-get update
sudo apt-get install -y mongodb-org

sudo systemctl daemon-reload
sudo systemctl enable --now mongod
sudo systemctl status mongod      # active (running)
mongod --version                  # db version v8.0.x
```
> On Debian 13 (trixie) use the **bookworm** repo line above — MongoDB doesn't
> publish a trixie repo yet, and the bookworm packages run fine on trixie.
> The server connects to `mongodb://127.0.0.1:27017` (no auth) and creates the
> DB automatically on first run.

## 4. Get the code
```bash
mkdir -p ~/pisignage && cd ~/pisignage
git clone -b es6-mongodb8 https://github.com/santhoshmaderi/pisignage-server.git
cd pisignage-server
```

## 5. Create the media directory (a **sibling** of the repo)
The config uses `../media` relative to the server's working dir, so it must sit
one level **above** the repo folder:
```bash
mkdir -p ../media          # → ~/pisignage/media
```
(`data/` — sync_folders, licenses, releases — is created under the repo automatically.)

## 6. Install dependencies
```bash
npm install
npm audit fix              # optional: clears the easily-fixable advisories
```
- `npm warn deprecated gm@…` and `fluent-ffmpeg@…` are expected — harmless.
- A few advisories remain in the legacy `919.socket.io` chain (`uglify-js`,
  `xmlhttprequest`, old `ws`) that's kept for old players. **Don't** run
  `npm audit fix --force` — it would break that legacy socket path.

## 7. Run the server

### Quick / development
```bash
node server.js             # or: npm start  (nodemon)
```
Expected output: `MongoDB connected successfully` … `Express server listening on port 3000 in development mode`.

### Production (recommended — pm2, auto-restart + boot)
```bash
sudo npm install -g pm2
NODE_ENV=production PORT=3000 pm2 start server.js --name pisignage
pm2 save
pm2 startup     # run the command it prints, to start on boot
```

Open the firewall if needed: `sudo ufw allow 3000`.

## 8. Access
- Browse to `http://<server-ip>:3000/` → it **redirects to the v2 React UI** and shows the login.
- Default credentials: **`pi` / `pi`** (change them under Settings → Download Access).
- Legacy AngularJS UI (still bundled): `http://<server-ip>:3000/index.html`.
- REST API: `http://<server-ip>:3000/api/...` (HTTP Basic auth).

---

## Troubleshooting

**`Error: Command failed: convert -version` / "install imagemagick".**
Install ImageMagick (step 1): `sudo apt-get install -y imagemagick`. This is the
`convert` binary. It's non-fatal — the server still starts, but image thumbnails
won't generate until it's present. (If your Debian ships ImageMagick 7 without a
`convert` symlink, install the compatibility binary or `sudo ln -s $(which magick) /usr/local/bin/convert`.)

**`setlocale: LC_CTYPE: cannot change locale (UTF-8)`.**
Harmless warning. To silence:
```bash
sudo apt-get install -y locales
sudo sed -i 's/# *en_US.UTF-8/en_US.UTF-8/' /etc/locale.gen
sudo locale-gen
echo 'export LANG=en_US.UTF-8' >> ~/.bashrc
```

**On startup it downloads `piimageX.Y.Z.zip` from pisignage.com.**
Expected — the server syncs player firmware/release images into `data/releases`
so players can self-update. It needs internet and some disk; it only runs when a
newer release is published. To run fully offline, block/ignore those downloads.

**"After update if you do not see your groups, change the uri … pisignage-dev".**
A legacy hint. By default (no `NODE_ENV`) the server uses DB `pisignage-server-dev`;
with `NODE_ENV=production` it uses `pisignage-server-prod`. Pick one consistently
so you don't "lose" data between dev/prod DBs.

**Don't run as root.** Run under the `pi` (or a dedicated) user; pm2/systemd
manages start-on-boot.

---

## Quick reference — everything in order
```bash
sudo apt-get update
sudo apt-get install -y git curl build-essential ffmpeg imagemagick
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs
curl -fsSL https://pgp.mongodb.com/server-8.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-8.0.gpg --dearmor
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/debian bookworm/mongodb-org/8.0 main" | sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list
sudo apt-get update && sudo apt-get install -y mongodb-org
sudo systemctl enable --now mongod
mkdir -p ~/pisignage && cd ~/pisignage
git clone -b es6-mongodb8 https://github.com/santhoshmaderi/pisignage-server.git
cd pisignage-server && mkdir -p ../media && npm install && npm audit fix
NODE_ENV=production PORT=3000 node server.js     # or pm2 (see step 7)
# → http://<server-ip>:3000/  (login pi / pi)
```
