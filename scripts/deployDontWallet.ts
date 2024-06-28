import { toNano } from '@ton/core';
import { DontWallet } from '../wrappers/DontWallet';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const dontWallet = provider.open(await DontWallet.fromInit());

    await dontWallet.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        {
            $$type: 'Deploy',
            queryId: 0n,
        }
    );

    await provider.waitForDeploy(dontWallet.address);

    // run methods on `dontWallet`
}
