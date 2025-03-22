import { setDefaultIcon } from './icon';
import { resetStorage } from './storage';

export const reset = () => {
    resetStorage();
    setDefaultIcon();
};
