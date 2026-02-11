declare const __APP_VERSION__: string;
export const APP_VERSION: string = __APP_VERSION__;

export const PLAYER_COLORS = ['#4361ee', '#e84393', '#00b894', '#f39c12'];

export const API_BASE = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? 'http://localhost:8787'
    : 'https://thai-bingo-api.erks.workers.dev';
