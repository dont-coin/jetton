import { CompilerConfig } from '@ton/blueprint';

export const compile: CompilerConfig = {
    lang: 'tact',
    target: 'contracts/dont_jetton.tact',
    options: {
        debug: true,
    },
};
