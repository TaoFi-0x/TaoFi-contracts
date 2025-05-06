import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import chai from "chai";
import { ethers } from "hardhat";
import { MockStakingPrecompile, TAOStaker } from "../../typechain-types";

const { expect } = chai;

describe("TAOStaker", function () {
  let taoStaker: TAOStaker;
  let mockStakingPrecompile: MockStakingPrecompile;
  let owner: SignerWithAddress;
  let nonOwner: SignerWithAddress;
  const PUB_KEY =
    "0x1234567890123456789012345678901234567890123456789012345678901234";
  const STAKING_PRECOMPILE = "0x0000000000000000000000000000000000001001";
  const HOTKEY1 =
    "0x1111111111111111111111111111111111111111111111111111111111111111";
  const HOTKEY2 =
    "0x2222222222222222222222222222222222222222222222222222222222222222";

  beforeEach(async function () {
    [owner, nonOwner] = await ethers.getSigners();

    // Deploy MockStakingPrecompile
    const MockStakingPrecompileFactory = await ethers.getContractFactory(
      "MockStakingPrecompile"
    );
    mockStakingPrecompile = await MockStakingPrecompileFactory.deploy();
    await mockStakingPrecompile.deployed();

    // Deploy TAOStaker
    const TAOStakerFactory = await ethers.getContractFactory("TAOStaker");
    taoStaker = await TAOStakerFactory.deploy();
    await taoStaker.deployed();

    // Initialize TAOStaker with mock staking precompile
    await taoStaker.initialize(PUB_KEY, mockStakingPrecompile.address);
  });

  describe("Initialization", function () {
    it("should initialize with correct values", async function () {
      expect(await taoStaker.getPubKey()).to.equal(PUB_KEY);
      expect(await taoStaker.getStakingPrecompile()).to.equal(
        mockStakingPrecompile.address
      );
    });

    it("should revert if initialized twice", async function () {
      await expect(
        taoStaker.initialize(PUB_KEY, mockStakingPrecompile.address)
      ).to.be.revertedWith("Initializable: contract is already initialized");
    });
  });

  describe("Getters", function () {
    it("should return correct pub key", async function () {
      expect(await taoStaker.getPubKey()).to.equal(PUB_KEY);
    });

    it("should return correct staking precompile address", async function () {
      expect(await taoStaker.getStakingPrecompile()).to.equal(
        mockStakingPrecompile.address
      );
    });

    it("should return empty hotkeys array initially", async function () {
      const hotkeys = await taoStaker.getHotkeys();
      expect(hotkeys.length).to.equal(0);
    });
  });

  describe("Setters", function () {
    it("should allow owner to set pub key", async function () {
      const newPubKey =
        "0x9876543210987654321098765432109876543210987654321098765432109876";
      await taoStaker.connect(owner).setPubKey(newPubKey);
      expect(await taoStaker.getPubKey()).to.equal(newPubKey);
    });

    it("should not allow non-owner to set pub key", async function () {
      const newPubKey =
        "0x9876543210987654321098765432109876543210987654321098765432109876";
      await expect(
        taoStaker.connect(nonOwner).setPubKey(newPubKey)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should allow owner to set staking precompile", async function () {
      const newPrecompile = "0x0000000000000000000000000000000000001002";
      await taoStaker.connect(owner).setStakingPrecompile(newPrecompile);
      expect(await taoStaker.getStakingPrecompile()).to.equal(newPrecompile);
    });

    it("should not allow non-owner to set staking precompile", async function () {
      const newPrecompile = "0x0000000000000000000000000000000000001002";
      await expect(
        taoStaker.connect(nonOwner).setStakingPrecompile(newPrecompile)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Hotkey Management", function () {
    it("should allow owner to add hotkeys", async function () {
      const hotkeys = [HOTKEY1, HOTKEY2];
      await taoStaker.connect(owner).addHotKeys(hotkeys);

      const storedHotkeys = await taoStaker.getHotkeys();
      expect(storedHotkeys.length).to.equal(2);
      expect(storedHotkeys[0]).to.equal(HOTKEY1);
      expect(storedHotkeys[1]).to.equal(HOTKEY2);
    });

    it("should not allow non-owner to add hotkeys", async function () {
      const hotkeys = [HOTKEY1, HOTKEY2];
      await expect(
        taoStaker.connect(nonOwner).addHotKeys(hotkeys)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should revert when adding duplicate hotkey", async function () {
      const hotkeys = [HOTKEY1];
      await taoStaker.connect(owner).addHotKeys(hotkeys);
      await expect(
        taoStaker.connect(owner).addHotKeys(hotkeys)
      ).to.be.revertedWith("HotKeyAlreadyAdded");
    });

    it("should allow owner to remove hotkeys", async function () {
      // First add hotkeys
      const hotkeys = [HOTKEY1, HOTKEY2];
      await taoStaker.connect(owner).addHotKeys(hotkeys);

      // Then remove the first hotkey
      await taoStaker.connect(owner).removeHotKeys([0]);

      const storedHotkeys = await taoStaker.getHotkeys();
      expect(storedHotkeys.length).to.equal(1); // Array length remains same
      expect(storedHotkeys[0]).to.equal(HOTKEY2);
      expect(await taoStaker.isHotKeyAdded(HOTKEY1)).to.be.false;
    });

    it("should not allow non-owner to remove hotkeys", async function () {
      await taoStaker.connect(owner).addHotKeys([HOTKEY1]);
      await expect(
        taoStaker.connect(nonOwner).removeHotKeys([0])
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should revert when removing non-existent hotkey", async function () {
      await expect(taoStaker.connect(owner).removeHotKeys([0])).to.be.reverted;
    });
  });
});
