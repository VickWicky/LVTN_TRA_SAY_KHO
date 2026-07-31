import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
const wsHostUrl = new URL(API_URL);

const echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY || '4p6tjjbdrdt7trrjp5hc',
    wsHost: wsHostUrl.hostname,
    wsPort: wsHostUrl.protocol === 'https:' ? 443 : 6001,
    wssPort: wsHostUrl.protocol === 'https:' ? 443 : 6001,
    forceTLS: wsHostUrl.protocol === 'https:',
    enabledTransports: ['ws', 'wss'],
});

export default echo;
