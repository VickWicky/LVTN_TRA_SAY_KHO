import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
const wsHostUrl = new URL(API_URL);

const echo = new Echo({
    broadcaster: 'pusher',
    key: '08d57782ce4702ed5f23',
    cluster: 'ap1',
    forceTLS: true,
});

export default echo;
