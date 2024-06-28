import { toNano } from '@ton/core';
import { DontJetton } from '../wrappers/DontJetton';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const dontJetton = provider.open(await DontJetton.fromInit());

    await dontJetton.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        {
            $$type: 'Deploy',
            queryId: 0n,
        }
    );

    await provider.waitForDeploy(dontJetton.address);

    // run methods on `dontJetton`
}
