import {
    Blockchain,
    SandboxContract,
    TreasuryContract,
    prettyLogTransactions,
    printTransactionFees,
} from '@ton/sandbox';
import { Transaction, beginCell, contractAddress, toNano } from '@ton/core';
import { DontJetton, Transfer } from '../wrappers/DontJetton';
import '@ton/test-utils';
import { DontWallet } from '../wrappers/DontWallet';
import { flattenTransaction } from '@ton/test-utils';

describe('DontJetton', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let dontJetton: SandboxContract<DontJetton>;

    let gamer: SandboxContract<TreasuryContract>;
    let gamerWallet: SandboxContract<DontWallet>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        deployer = await blockchain.treasury('deployer');
        dontJetton = blockchain.openContract(await DontJetton.fromInit(deployer.address, beginCell().endCell()));

        const deployResult = await dontJetton.send(
            deployer.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'Deploy',
                queryId: 0n,
            },
        );

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: dontJetton.address,
            deploy: true,
            success: true,
        });
        gamer = await blockchain.treasury('gamer');
        gamerWallet = blockchain.openContract(await DontWallet.fromInit(gamer.address, dontJetton.address));

        const deployResult2 = await gamerWallet.send(
            gamer.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'Deploy',
                queryId: 0n,
            },
        );

        console.log({
            owner: gamer.address,
            master: dontJetton.address,
            contractAddress: await gamerWallet.getGetMyAddress(),
            fromMaster: await dontJetton.getGetWalletAddress(gamer.address),
        });

        expect(deployResult2.transactions).toHaveTransaction({
            from: gamer.address,
            to: gamerWallet.address,
            deploy: true,
            success: true,
        });
    });

    describe('Mining', () => {
        it.only('when minting successful', async () => {
            const transferMessage: Transfer = {
                $$type: 'Transfer',
                query_id: 1n,
                amount: toNano(15574),
                destination: gamer.address,
                response_destination: gamer.address,
                forward_payload: beginCell().endCell(),
                forward_ton_amount: toNano('0.1'),
                custom_payload: null,
            };

            const mintResult = await dontJetton.send(
                deployer.getSender(),
                {
                    value: toNano('0.06'),
                },
                transferMessage,
            );

            // const ttt = await dontJetton.getGetWalletAddress(gamer.address);

            console.log(await gamerWallet.getGetWalletData())

            prettyLogTransactions(mintResult.transactions);
            console.log(printTransactionFees(mintResult.transactions));
            // console.log({
            //     deployer: deployer.address,
            //     dontJetton: dontJetton.address,

            //     destination: gamer.address,
            //     gamerWaller: gamerWallet.address,
            //     ttt,
            // });

            // mintResult.transactions.forEach((trx: Transaction) => {
            //     // console.log(trx);
            //     console.log(flattenTransaction(trx));
            //     // console.log(trx.inMessage?.info);
            // });

            // expect(mintResult.transactions).toHaveTransaction({
            //     from: dontJetton.address,
            //     to: gamerWallet.address,
            //     success: true,
            // });
        });

        it('when amount more than max_supply', async () => {});

        it('when minting stopped', async () => {});

        it('when gas not enough', async () => {});
    });
});
