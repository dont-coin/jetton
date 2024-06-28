import { Blockchain, SandboxContract, TreasuryContract, printTransactionFees } from '@ton/sandbox';
import { Cell, Transaction, beginCell, toNano } from '@ton/core';
import { DontWallet, Transfer } from '../wrappers/DontWallet';
import { DontJetton } from '../wrappers/DontJetton';
import '@ton/test-utils';
import { flattenTransaction } from '@ton/test-utils';

describe('DontWallet', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let dontWallet: SandboxContract<DontWallet>;
    let jetton: SandboxContract<DontJetton>;
    let jettonMaster: SandboxContract<TreasuryContract>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        jettonMaster = await blockchain.treasury('jetton-master');
        jetton = blockchain.openContract(await DontJetton.fromInit(jettonMaster.address, beginCell().endCell()));

        const deployJettonResult = await jetton.send(
            jettonMaster.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'Deploy',
                queryId: 0n,
            },
        );

        expect(deployJettonResult.transactions).toHaveTransaction({
            from: jettonMaster.address,
            to: jetton.address,
            deploy: true,
            success: true,
        });

        deployer = await blockchain.treasury('deployer');
        dontWallet = blockchain.openContract(await DontWallet.fromInit(deployer.address, jetton.address));

        const deployResult = await dontWallet.send(
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
            to: dontWallet.address,
            deploy: true,
            success: true,
        });
    });

    xit('check init balance to be 0', async () => {
        let balance = (await dontWallet.getGetWalletData()).balance;

        expect(balance).toEqual(0n);
    });

    describe('message Transfer', () => {
        let receiver: SandboxContract<TreasuryContract>;
        let receiverWallet: SandboxContract<DontWallet>;

        beforeEach(async () => {
            receiver = await blockchain.treasury('receiver');
            receiverWallet = blockchain.openContract(await DontWallet.fromInit(receiver.address, jetton.address));

            const deployResult = await receiverWallet.send(
                receiver.getSender(),
                {
                    value: toNano('0.05'),
                },
                {
                    $$type: 'Deploy',
                    queryId: 0n,
                },
            );

            expect(deployResult.transactions).toHaveTransaction({
                from: receiver.address,
                to: receiverWallet.address,
                deploy: true,
                success: true,
            });
        });

        it('when data is correct', async () => {
            const transferMessage: Transfer = {
                $$type: 'Transfer',
                query_id: 1n,

                amount: 2n,
                custom_payload: null,
                destination: receiver.address,
                response_destination: deployer.address,

                forward_payload: beginCell().endCell(),
                forward_ton_amount: toNano('0.1'),
            };

            const transferResult = await dontWallet.send(
                deployer.getSender(),
                {
                    value: toNano('0.05'),
                },
                transferMessage,
            );

            const balanceDeployer = await dontWallet.getGetWalletData();
            const receiverData = await receiverWallet.getGetWalletData();

            // console.log({
            //     deployer: deployer.address,
            //     balanceDeployer: balanceDeployer.balance,
            //     deployerWallet: dontWallet.address,

            //     to: receiver.address,
            //     receiverData: receiverData.balance,
            //     resiverWaller: receiverWallet.address,
            // });

            // transferResult.transactions.forEach((trx: Transaction) => {
            //     // console.log(trx);
            //     console.log(flattenTransaction(trx));
            //     // console.log(trx.inMessage?.info);
            // });

            console.log(printTransactionFees(transferResult.transactions));

            expect(transferResult.transactions).toHaveTransaction({
                from: dontWallet.address,
                to: receiverWallet.address,
                success: true,
            });
        });

        it('when amount is incorrect', async () => {});

        it('when gas is not correct', async () => {});

        it('when balance is less then zero', async () => {});
    });
});
