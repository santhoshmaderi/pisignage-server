import mongoose from 'mongoose';
const { Schema } = mongoose;

const SettingsSchema = new Schema({
    installation: {type: String , default: "local"},
    newLayoutsEnable: {type: Boolean , default: false},
    systemMessagesHide: {type: Boolean, default: false},
    forceTvOn: {type: Boolean, default: false},
    disableCECPowerCheck: {type: Boolean, default: false},
    defaultDuration: {type: Number, default: 10},
    language: {type: String , default: 'en'},
    logo: {type: String},
    url: {type: String},
    sshPassword: {type: String, default: null},
    enableLog : {type: Boolean, default: false},
    hideWelcomeNotice: {type: Boolean, default: false},
    reportIntervalMinutes:  {type: Number, default: 5},
    enableYoutubeDl : {type: Boolean, default: true},
    // AI assistant is OFF by default. Enabling it in Settings only flips this
    // flag; the operator must still install the local LLM (see
    // scripts/install-llm.sh) before the assistant can answer anything.
    assistantEnabled: {type: Boolean, default: false},
    // Ollama model the assistant runs. Empty = use the env/default
    // (OLLAMA_MODEL, else qwen2.5:3b). Set from Settings → piSignage Assistant;
    // must be a tool-capable model installed in Ollama.
    assistantModel: {type: String, default: ''},
    authCredentials: {
        user: {type: String , default: 'pi'},
        password: {type: String , default: 'pi'}
    }
}
);

export const Settings = mongoose.model('Settings', SettingsSchema);

