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
    it("hash(Date) calculates hash code", function() {
        var mj = new MerkleJson();
        var t = new Date(Date.UTC(2018,1,14));
        var obj = {
            t,
        };
        should(mj.hash(obj)).equal(mj.hash({
            t: new Date(Date.UTC(2018,1,14)),
        }));
        should(mj.hash(obj)).not.equal(mj.hash({
            t: new Date(Date.UTC(2018,1,15)),
        }));
        should(mj.hash(obj)).match(/b6777f0/);
        should(mj.hash(obj)).equal(mj.hash({
            t: t.toJSON(),
        }));
        
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
    it("hash(object,useMerkle) calculates hash code", function() {
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
    it("TESTTESThash(object) ignores toJSON", function() {
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
        var mj = new MerkleJson();

        // The random property affects the hash
        var tc1 = new TestClass();
        var tc2 = new TestClass();
        var hash1 = mj.hash(tc1);
        var hash2 = mj.hash(tc2);
        should(hash1).not.equal(hash2);

        // Call toJSON() to hash unserialized properties
        var hash1 = mj.hash(tc1.toJSON());
        var hash2 = mj.hash(tc2.toJSON());
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
    it("stringify(obj) serialize object canonically", function() {
        var obj1 = {
            a: 1,
            b: 2,
            c: 3,
            d: 4,
        };
        var obj2 = {
            d: 4,
            a: 1,
            c: 3,
            b: 2,
        };
    });
    it("stringify(obj) serialize arrays canonically", function() {
        var obj1 = {
            a: 1,
            b: 2,
            c: 3,
            d: 4,
        };
        var obj2 = {
            d: 4,
            a: 1,
            c: 3,
            b: 2,
        };
        var mj = new MerkleJson();

        var list1 = [1,2,obj1];
        var list2 = [1,2,obj2];

        should(mj.stringify(list1)).equal('[1,2,{"a":1,"b":2,"c":3,"d":4}]');
        should(mj.stringify(list1)).equal(JSON.stringify(list1));

        should(mj.stringify(list2)).equal('[1,2,{"a":1,"b":2,"c":3,"d":4}]');
        should(mj.stringify(list2)).not.equal(JSON.stringify(list2));

        // Arrays are stringify canonically
        should(mj.stringify(list1)).equal(mj.stringify(list2));
    });
    it("stringify(obj) serializes atomic values", function() {
        var mj = new MerkleJson();
        should(mj.stringify(true)).equal(JSON.stringify(true));
        should(mj.stringify(false)).equal(JSON.stringify(false));
        should(mj.stringify(undefined)).equal(JSON.stringify(undefined));
        should(mj.stringify(null)).equal(JSON.stringify(null));
        should(mj.stringify(() => 1)).equal(JSON.stringify(() => 1));
        function f(a) {
            return a+1;
        };
        should(mj.stringify(f)).equal(JSON.stringify(f));
        var t = new Date();
        should(mj.stringify(t)).equal(JSON.stringify(t));
        should(mj.stringify(-1/3)).equal(JSON.stringify(-1/3));
    });
    it("stringify(obj) honors toJSON() method of object", function() {
        var mj = new MerkleJson();
        class TestObj {
            constructor(a) {
                this.a = a;
                this.random = Math.random();
            }
            toJSON() {
                return {
                    a: this.a,
                }
            }
        }

        var obj = new TestObj(1,2);
        should(mj.stringify(obj)).equal('{"a":1}');
    });
    it("TESTTESThash(object) inside toJSON()", ()=>{
        var mj = new MerkleJson();
        class TestClass {
            constructor() {
                this.color = "red";
            }

            toJSON() {
                this.merkleHash = mj.hash(this, true);
                return this;
            }
        }
        var obj = new TestClass();
        var merkleHash = mj.hash({color:"red"});
        var json = JSON.stringify(obj);
        should(json).equal(JSON.stringify({
            color: "red",
            merkleHash,
        }));
        should(mj.hash(JSON.parse(json))).equal(merkleHash);
    });

})
