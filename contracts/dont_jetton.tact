import "@stdlib/deploy";
import "@stdlib/ownable";

import "./messages";
import "./dont_wallet";

struct JettonMetaData {
    total_supply: Int;
    max_supply: Int;
    mintable: Bool;
    owner: Address;
    jetton_content: Cell;
    jetton_wallet_code: Cell;
}

contract DontJetton with Deployable, OwnableTransferable {
    const minTonsForStorage: Int = ton("0.01");
    const gasConsumption: Int = ton("0.02");

    total_supply: Int as coins = 0;
    max_supply: Int as coins = 1_000_000_000_000;
    mintable: Bool = true;
    owner: Address;
    jetton_content: Cell;

     init(owner: Address, jetton_content: Cell) {
        self.owner = owner;
        self.jetton_content = jetton_content;
    }

    // Minting jetton
    receive(msg: Transfer) {
        self.requireOwner();

        let ctx: Context = context();

        // After final phase we are stoping mint
        require(self.mintable, "Mint stopped");

        // Gas price
        let fwdFee: Int = ctx.readForwardFee() * 2;  
        let final: Int =  2 * self.gasConsumption + self.minTonsForStorage + fwdFee + msg.forward_ton_amount;
        require(ctx.value > min(final, ton("0.01")), "Insufficient ton"); 

        self.total_supply = self.total_supply + msg.amount;
        require(self.max_supply < self.total_supply, "Not allowed");

        // TODO: how to calculate main tokenomic
        // Calculate fee in jetton when we do minting

        let init: StateInit = initOf DontWallet(msg.destination, myAddress());
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

    receive(msg: ProvideWalletAddress) {
        let ctx: Context = context();
        
        let wallet: Address = contractAddress(initOf DontWallet(msg.owner_address, myAddress()));
        let owner_address: Address? = null;
        if (msg.include_address) {
            owner_address = msg.owner_address;
        }

        send(SendParameters {
            to: ctx.sender,
            value: 0,
            mode: SendRemainingValue,
            body: TakeWalletAddress {
                query_id: msg.query_id,
                wallet_address: wallet,
                owner_address: owner_address
            }.toCell()
        });
    }

    receive("final step") {
        self.requireOwner();
        self.mintable = false;
    }

    receive(msg: BurnNotification) {
        let init: StateInit = initOf DontWallet(msg.sender, myAddress());
        require(contractAddress(init) == sender(), "Invalid sender");

        self.total_supply = self.total_supply - msg.amount;
        send(SendParameters {
            to: msg.response_destination,
            value: 0,
            mode: SendRemainingValue,
            body: Excesses {
                query_id: msg.query_id
            }.toCell()
        });
    }

    get fun get_jetton_data(): JettonMetaData {
        return JettonMetaData {
            total_supply: self.total_supply, 
            max_supply: self.max_supply,
            mintable: self.mintable, 
            owner: self.owner, 
            jetton_content: self.jetton_content, 
            jetton_wallet_code: (initOf DontWallet(self.owner, myAddress())).code
        };
    }

    get fun get_jetton_address(): Address {
        return myAddress();
    }

    get fun get_wallet_address(owner_address: Address): Address {
        let init: StateInit = initOf DontWallet(owner_address, myAddress());
        dump("MASTER");
        dump(owner_address);
        dump(myAddress());
        dump(contractAddress(init));
        return contractAddress(init);
    }
}
