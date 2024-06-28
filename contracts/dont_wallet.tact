import "@stdlib/deploy";
import "@stdlib/ownable";

import "./messages";

struct DontWalletMetaData {
    balance: Int;
    owner: Address;
    master: Address;
    code: Cell;
}

contract DontWallet with Deployable, Ownable {
    const minTonsForStorage: Int = ton("0.01");
    const gasConsumption: Int = ton("0.02");

    balance: Int as coins = 0;
    owner: Address;
    master: Address;

    init(owner: Address, master: Address) {
        self.owner = owner;
        self.master = master;
    }

    receive(msg: Transfer) {
        self.requireOwner();
        let ctx: Context = context();

        // Gas checks
        let fwdFee: Int = ctx.readForwardFee() * 2;  
        let final: Int =  2 * self.gasConsumption + self.minTonsForStorage + fwdFee;
        require(ctx.value > min(final, ton("0.01")), "Insufficient ton"); 

        // Check for balance
        self.balance = self.balance - msg.amount;
        require(self.balance >= 0, "Invalid balance");

        let init: StateInit = initOf DontWallet(msg.destination, self.master);
        let to: Address = contractAddress(init);

        send(SendParameters {
            to: to,
            value: 0,
            mode: SendRemainingValue,
            bounce: false,
            body: InternalTransfer {
                query_id: msg.query_id,
                amount: msg.amount,
                from: self.owner,
                response_destination: msg.response_destination,
                forward_ton_amount: msg.forward_ton_amount,
                forward_payload: msg.forward_payload
            }.toCell(),
            data: init.data,
            code: init.code
        });
    }

    receive(msg: InternalTransfer) {
        let ctx: Context = context();

        if (ctx.sender != self.master) {
            let init: StateInit = initOf DontWallet(msg.from, self.master);
            require(contractAddress(init) == ctx.sender, "Invalid sender");
        }

        // Change contract amount
        self.balance = self.balance + msg.amount;
        require(self.balance >= 0, "Invalid token amount");

        // Get value for gas
        let msgValue: Int = self.msgValue(ctx.value);  
        let fwdFee: Int = ctx.readForwardFee();
        msgValue = msgValue - msg.forward_ton_amount - fwdFee;

        if (msg.forward_ton_amount > 0) { // 0x7362d09c - notify the new owner of DontJetton that the transfer is complete
            send(SendParameters {
                to: self.owner,
                value: msg.forward_ton_amount,
                mode: SendPayGasSeparately | SendIgnoreErrors,
                bounce: false,
                body: TransferNotification {
                    query_id: msg.query_id,
                    amount: msg.amount,
                    sender: msg.from,
                    forward_payload: msg.forward_payload
                }.toCell()
            });
        }

        if (msgValue > 0) { // 0xd53276db -- Cashback to the original Sender
            send(SendParameters{
                to: msg.response_destination,
                value: msgValue,
                mode: SendIgnoreErrors,
                bounce: false,
                body: Excesses {
                    query_id: msg.query_id
                }.toCell()
            });
        }
    }

    receive(msg: Burn) {
        self.requireOwner();

        let ctx: Context = context();

        let fwdFee: Int = ctx.readForwardFee(); // Gas checks
        require(ctx.value > fwdFee + 2 * self.gasConsumption + self.minTonsForStorage, "Invalid value - Burn");

        self.balance = self.balance - msg.amount;
        require(self.balance >= 0, "Invalid token amount");

        send(SendParameters{
            to: self.master,
            value: 0,
            mode: SendRemainingValue,
            body: BurnNotification {
                query_id: msg.query_id,
                amount: msg.amount,
                sender: self.owner,
                response_destination: msg.response_destination
            }.toCell()
        });
    }

    bounced(src: bounced<InternalTransfer>) {
        self.balance = self.balance + src.amount;
    }

    bounced(src: bounced<BurnNotification>) {
        self.balance = self.balance + src.amount;
    }

    // Getters

    get fun msgValue(value: Int): Int {
        let msgValue: Int = value;
        let tonBalanceBeforeMsg: Int = myBalance() - msgValue;
        let storageFee: Int = self.minTonsForStorage - min(tonBalanceBeforeMsg, self.minTonsForStorage);
        msgValue = msgValue - (storageFee + self.gasConsumption);

        return msgValue;
    }

    get fun get_my_address(): Address {
        let init: StateInit = initOf DontWallet(self.owner, self.master);
        dump("WALLET");
        dump(self.owner);
        dump(self.master);
        dump(contractAddress(init));
        return contractAddress(init);
    }

    get fun get_wallet_data(): DontWalletMetaData {
        return DontWalletMetaData {
            balance: self.balance, 
            owner: self.owner, 
            master: self.master, 
            code: (initOf DontWallet(self.owner, self.master)).code
        };
    }
}
