import path from 'path';

const rootPath = process.cwd();
const dataDir = path.join(rootPath, 'data');
const assetDir = path.join(rootPath, '../media');

export default {
    root: rootPath,
    dataDir: dataDir,
    releasesDir: dataDir+'/releases',

    uploadDir: assetDir,
    licenseDir: dataDir+'/licenses',
    licenseDirPath: dataDir+'/licenses/',
    syncDir: path.join(dataDir, '/sync_folders'),
    syncDirPath: path.join(dataDir, '/sync_folders/'),
    viewDir: path.join(rootPath, '/app/views'),
    mediaDir: assetDir,
    mediaPath: assetDir + '/',
    thumbnailDir: assetDir + '/_thumbnails',
    defaultPlaylist: "default",
    logFile: rootPath+ "/../forever_out.log",
    logStoreDir: assetDir+ "/_logs",
    mongo: {
        options: {
            db: {
                safe: true
            }
        }
    },
    session: {
        secret: 'piSignage'
    },
    filenameRegex: /[&\/\\#,+()$~%'":*?<>{}]/g,
    groupNameRegEx: /[&\/\\#,+()$~%'":*?<>{}\^]/g,
    videoRegex: /(mp4|mov|m4v|avi|webm|wmv|flv|mkv|mpg|mpeg|3gp)$/i,
    audioRegex: /(mp3|m4a|mp4a|aac)$/i,
    imageRegex: /(jpg|jpeg|png|gif|bmp)$/i,
    htmlRegex: /\.html$/,
    noticeRegex: /\.html$/,
    zipfileRegex: /(.zip|.gz|.bz2)$/i,
    repofileRegex: /\.repo$/i,
    liveStreamRegex: /\.tv$/i,
    omxStreamRegex:  /\.stream$/i,
    pdffileRegex:           /\.pdf$/i,
    txtFileRegex:           /\.txt$/i,
    linkUrlRegex: /\.link$/i,
    CORSLink:  /\.weblink$/i,
    localFolderRegex:       /\.local$/i,
    mediaRss:               /\.mrss$/i,
    radioFileRegex:         /\.radio$/i,
    brandRegex:             /^(brand_intro|brand_intro_portrait)\./i,
    nestedPlaylist:         /^__/i,
    systemAssets: ["_system_notice.html"],

    // AI assistant (chat) — talks to a local Ollama instance for tool-calling.
    // All overridable via environment so the model can be swapped without code
    // changes (kept model-agnostic on purpose).
    assistant: {
        ollamaUrl:         process.env.OLLAMA_URL   || 'http://localhost:11434',
        model:             process.env.OLLAMA_MODEL || 'qwen2.5:3b',
        // Upper bound on the tool-call/answer loop so a confused small model
        // can't spin forever.
        maxToolIterations: parseInt(process.env.OLLAMA_MAX_ITER || '5', 10),
        // Per-request timeout for a single Ollama call (CPU inference is slow).
        requestTimeoutMs:  parseInt(process.env.OLLAMA_TIMEOUT_MS || '120000', 10),
        // Directory of .md/.txt help/troubleshooting articles searched by the
        // search_help_docs tool (simple keyword scoring — no embeddings needed).
        helpDocsDir:       path.join(dataDir, 'help-docs')
    }
};
