(typeof describe === 'function') && describe("MerkleJson", function() {
    const should = require("should");
    const fs = require('fs');
    const path = require('path');
    const MerkleJson = require('../index').MerkleJson;

    it("hash(string) calculates hash code", function() {
        var mj = new MerkleJson();

        // MD5 test
        should.equal(mj.hash(''), 'd41d8cd98f00b204e9800998ecf8427e');
        should.equal(mj.hash('hello\n'), 'b1946ac92492d2347c6235b4d2611184');
        should.equal(mj.hash(' '), '7215ee9c7d9dc229d2921a40e899ec5f');
        should.equal(mj.hash('HTML'), '4c4ad5fca2e7a3f74dbb1ced00381aa4');

        // UNICODE should "kinda work" but perhaps not as other expect
        //should.equal(mj.hash('\u2190'), 'fe98e12bb396ee46bf88efa6fc55ac08'); // other MD5
        should.equal(mj.hash('\u2190'), '5adcb503750876bb69cfc0a9289f9fb8'); // hmmmm....
        should.notEqual(mj.hash('\u2190'), mj.hash('\u2191')); // kinda work

        // semantic test
        should.equal(mj.hash('hello'), mj.hash('hello'));
        should.notEqual(mj.hash('goodbye'), mj.hash('hello'));
    });
    it("hash(Array) calculates hash code", function() {
        var mj = new MerkleJson();
        should.equal(mj.hash(['HTML']), mj.hash(mj.hash('HTML')));
        should.equal(mj.hash(['HT','ML']), mj.hash(mj.hash('HT')+mj.hash('ML')));
        should.equal(mj.hash([1,2]), mj.hash(mj.hash('1')+mj.hash('2')));
    });
    it("hash(number) calculates hash code", function() {
        var mj = new MerkleJson();
        should.equal(mj.hash('123'), mj.hash(123));
        should.equal(mj.hash('123.456'), mj.hash(123.456));
    });
    it("hash(null) calculates hash code", function() {
        var mj = new MerkleJson();
        should.equal(mj.hash('null'), mj.hash(null));
    });
    it("hash(undefined) calculates hash code", function() {
        var mj = new MerkleJson();
        should.equal(mj.hash('undefined'), mj.hash(undefined));
    });
    it("hash(boolean) calculates hash code", function() {
        var mj = new MerkleJson();
        should.equal(mj.hash(true), mj.hash('true'));
    });
    it("hash(function) calculates hash code", function() {
        var mj = new MerkleJson();
        function f(x) { return x*x; }
        var fstr = f.toString();
        var g = (x) => x*x;
        var gstr = g.toString();

        should.equal(mj.hash(f), mj.hash(fstr));
        should.equal(mj.hash(g), mj.hash(gstr));
    });
    it("TESTTESThash(object,useMerkle) calculates hash code", function() {
        var mj = new MerkleJson({
            hashTag: 'myHashTag',
        });
        should.equal(mj.hash({a:1}), mj.hash('a:'+mj.hash(1)+','));
        should.equal(mj.hash({a:1,b:2}), mj.hash('a:'+mj.hash(1)+',b:'+mj.hash(2)+','));
        should.equal(mj.hash({b:2,a:1}), mj.hash('a:'+mj.hash(1)+',b:'+mj.hash(2)+',')); // keys are ordered
        var drives = {
            "drives":[
                {"type":"BeltDrive","maxPos":100},
                {"type":"BeltDrive"},
                {"type":"ScrewDrive"},
            ],
            "myHashTag":"2d21a6576194aeb1de7aea4d6726624d"
        };
        var hash100 = mj.hash(drives);
        drives.drives[0].maxPos++;

        // honor Merkle hashtTags
        var hash101 = mj.hash(drives);
        should(hash100).equal(hash101);

        // treat Merkle hashTags like regular properties
        var hash101 = mj.hash(drives, false);
        should(hash100).not.equal(hash101);

        // documentation
        var hash = mj.hash({size:{w:100,h:200}});
        should(hash).equal('e77b735125fec27a61c6f54b17fb6221');
    });
    it("hash(object) returns existing hash code if present", function() {
        var mj = new MerkleJson();
        var hfoo = mj.hash('foo');
        should.equal(mj.hash({merkleHash:hfoo}), hfoo);
        should.equal(mj.hash({merkleHash:hfoo,anything:'do-not-care'}), hfoo);
        should.equal(mj.hash([{merkleHash:hfoo,anything:'do-not-care'}]), mj.hash(hfoo));
        should.equal(mj.hash({merkleHash:'some-hash', a:1}), 'some-hash');
    });
    it("hash(object) handles objects with non-serializable properties", function() {
        class TestClass {
            constructor() {
                this.color = 'red';             // serialized
                this.random = Math.random();    // not-serialized
            }
            toJSON() { 
                return {
                    color: this.color,
                };
            }
        }
        var obj = (() => { 
           var o = {};
           o.color = 'red';
           return o;
        })();
        should(typeof obj.toJSON).equal('undefined');
        should(typeof new TestClass().toJSON).equal('function');
        var mj = new MerkleJson();
        var hash1 = mj.hash(new TestClass());
        var hash2 = mj.hash(new TestClass());
        should(hash1).equal(hash2);
    });
    it("hash(object) does not re-compute object having Merkle hash tags", function() {
        var mj = new MerkleJson();

        // if Merkle hash tag is present, honor it and do not calculate hash
        var useMerkleHash = true;
        var hash = mj.hash({
            any1: 'thing1', // not hashed
            any2: 'thing2', // not hashed
            any3: 'thing3', // not hashed
            merkleHash: 'e77b735125fec27a61c6f54b17fb6221',
        },useMerkleHash); 
        should(hash).equal('e77b735125fec27a61c6f54b17fb6221');

        // force hash tag recalculation 
        var useMerkleHash = false;
        var hash = mj.hash({
            any1: 'thing1', // not hashed
            any2: 'thing2', // not hashed
            any3: 'thing3', // not hashed
            merkleHash: 'e77b735125fec27a61c6f54b17fb6221', // ignored
        },useMerkleHash); 
        should(hash).equal('441e4f8dabdc6cb17dc9500cee73155b');

        // Merkle hash tags do not affect hash
        var hash = mj.hash({
            any1: 'thing1', // not hashed
            any2: 'thing2', // not hashed
            any3: 'thing3', // not hashed
        }); 
        should(hash).equal('441e4f8dabdc6cb17dc9500cee73155b');
    });
})