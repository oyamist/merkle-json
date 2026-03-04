import { describe, it, expect } from '@sc-voice/vitest';
import { MerkleJson } from "../index.mjs"
import fs from "fs";
import path from "path";

describe("MerkleJson (mjs)", function() {

    it("TESTTESThash(string) calculates hash code", function() {
        var mj = new MerkleJson();

        // MD5 test
        expect(mj.hash('')).toBe('d41d8cd98f00b204e9800998ecf8427e');
        expect(mj.hash('hello\n')).toBe('b1946ac92492d2347c6235b4d2611184');
        expect(mj.hash(' ')).toBe('7215ee9c7d9dc229d2921a40e899ec5f');
        expect(mj.hash('HTML')).toBe('4c4ad5fca2e7a3f74dbb1ced00381aa4');

        // UNICODE should "kinda work" but perhaps not as other expect
        //expect(mj.hash('\u2190')).toBe('fe98e12bb396ee46bf88efa6fc55ac08'); // other MD5
        expect(mj.hash('\u2190')).toBe('5adcb503750876bb69cfc0a9289f9fb8'); // hmmmm....
        expect(mj.hash('\u2190')).not.toBe(mj.hash('\u2191')); // kinda work

        // semantic test
        expect(mj.hash('hello')).toBe(mj.hash('hello'));
        expect(mj.hash('goodbye')).not.toBe(mj.hash('hello'));
    });
    it("hash(Date) calculates hash code", function() {
        var mj = new MerkleJson();
        var t = new Date(Date.UTC(2018,1,14));
        var obj = {
            t,
        };
        expect(mj.hash(obj)).toBe(mj.hash({
            t: new Date(Date.UTC(2018,1,14)),
        }));
        expect(mj.hash(obj)).not.toBe(mj.hash({
            t: new Date(Date.UTC(2018,1,15)),
        }));
        expect(mj.hash(obj)).toMatch(/b6777f0/);
        expect(mj.hash(obj)).toBe(mj.hash({
            t: t.toJSON(),
        }));

    });
    it("hash(Array) calculates hash code", function() {
        var mj = new MerkleJson();
        expect(mj.hash(['HTML'])).toBe(mj.hash(mj.hash('HTML')));
        expect(mj.hash(['HT','ML'])).toBe(mj.hash(mj.hash('HT')+mj.hash('ML')));
        expect(mj.hash([1,2])).toBe(mj.hash(mj.hash('1')+mj.hash('2')));
    });
    it("hash(number) calculates hash code", function() {
        var mj = new MerkleJson();
        expect(mj.hash('123')).toBe(mj.hash(123));
        expect(mj.hash('123.456')).toBe(mj.hash(123.456));
    });
    it("hash(null) calculates hash code", function() {
        var mj = new MerkleJson();
        expect(mj.hash('null')).toBe(mj.hash(null));
    });
    it("hash(undefined) calculates hash code", function() {
        var mj = new MerkleJson();
        expect(mj.hash('undefined')).toBe(mj.hash(undefined));
    });
    it("hash(boolean) calculates hash code", function() {
        var mj = new MerkleJson();
        expect(mj.hash(true)).toBe(mj.hash('true'));
    });
    it("hash(function) calculates hash code", function() {
        var mj = new MerkleJson();
        function f(x) { return x*x; }
        var fstr = f.toString();
        var g = (x) => x*x;
        var gstr = g.toString();

        expect(mj.hash(f)).toBe(mj.hash(fstr));
        expect(mj.hash(g)).toBe(mj.hash(gstr));
    });
    it("hash(object,useMerkle) calculates hash code", function() {
        var mj = new MerkleJson({
            hashTag: 'myHashTag',
        });
        expect(mj.hash({a:1})).toBe(mj.hash('a:'+mj.hash(1)+','));
        expect(mj.hash({a:1,b:2})).toBe(mj.hash('a:'+mj.hash(1)+',b:'+mj.hash(2)+','));
        expect(mj.hash({b:2,a:1})).toBe(mj.hash('a:'+mj.hash(1)+',b:'+mj.hash(2)+',')); // keys are ordered
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
        expect(hash100).toBe(hash101);

        // treat Merkle hashTags like regular properties
        var hash101 = mj.hash(drives, false);
        expect(hash100).not.toBe(hash101);

        // documentation
        var hash = mj.hash({size:{w:100,h:200}});
        expect(hash).toBe('e77b735125fec27a61c6f54b17fb6221');
    });
    it("hash(object) returns existing hash code if present", function() {
        var mj = new MerkleJson();
        var hfoo = mj.hash('foo');
        expect(mj.hash({merkleHash:hfoo})).toBe(hfoo);
        expect(mj.hash({merkleHash:hfoo,anything:'do-not-care'})).toBe(hfoo);
        expect(mj.hash([{merkleHash:hfoo,anything:'do-not-care'}])).toBe(mj.hash(hfoo));
        expect(mj.hash({merkleHash:'some-hash', a:1})).toBe('some-hash');
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
        expect(hash1).not.toBe(hash2);

        // Call toJSON() to hash unserialized properties
        var hash1 = mj.hash(tc1.toJSON());
        var hash2 = mj.hash(tc2.toJSON());
        expect(hash1).toBe(hash2);
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
        expect(hash).toBe('e77b735125fec27a61c6f54b17fb6221');

        // force hash tag recalculation
        var useMerkleHash = false;
        var hash = mj.hash({
            any1: 'thing1', // not hashed
            any2: 'thing2', // not hashed
            any3: 'thing3', // not hashed
            merkleHash: 'e77b735125fec27a61c6f54b17fb6221', // ignored
        },useMerkleHash);
        expect(hash).toBe('441e4f8dabdc6cb17dc9500cee73155b');

        // Merkle hash tags do not affect hash
        var hash = mj.hash({
            any1: 'thing1', // not hashed
            any2: 'thing2', // not hashed
            any3: 'thing3', // not hashed
        });
        expect(hash).toBe('441e4f8dabdc6cb17dc9500cee73155b');
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

        expect(mj.stringify(list1)).toBe('[1,2,{"a":1,"b":2,"c":3,"d":4}]');
        expect(mj.stringify(list1)).toBe(JSON.stringify(list1));

        expect(mj.stringify(list2)).toBe('[1,2,{"a":1,"b":2,"c":3,"d":4}]');
        expect(mj.stringify(list2)).not.toBe(JSON.stringify(list2));

        // Arrays are stringify canonically
        expect(mj.stringify(list1)).toBe(mj.stringify(list2));
    });
    it("stringify(obj) serializes atomic values", function() {
        var mj = new MerkleJson();
        expect(mj.stringify(true)).toBe(JSON.stringify(true));
        expect(mj.stringify(false)).toBe(JSON.stringify(false));
        expect(mj.stringify(undefined)).toBe(JSON.stringify(undefined));
        expect(mj.stringify(null)).toBe(JSON.stringify(null));
        expect(mj.stringify(() => 1)).toBe(JSON.stringify(() => 1));
        function f(a) {
            return a+1;
        };
        expect(mj.stringify(f)).toBe(JSON.stringify(f));
        var t = new Date();
        expect(mj.stringify(t)).toBe(JSON.stringify(t));
        expect(mj.stringify(-1/3)).toBe(JSON.stringify(-1/3));
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
        expect(mj.stringify(obj)).toBe('{"a":1}');
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
        expect(json).toBe(JSON.stringify({
            color: "red",
            merkleHash,
        }));
        expect(mj.hash(JSON.parse(json))).toBe(merkleHash);
    });

})
