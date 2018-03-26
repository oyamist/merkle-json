# merkle-json
Computing the hash of JSON objects can be tricky because JSON.stringify()
does not have a guaranteed string representation of a Javascript object.
Specifically, the following are equivalent and valid outputs of JSON.stringify():

```js
var json = "{size:{w:100,h:200}}";
var json = "{size:{h:100,w:200}}";
```

MerkleJson guarantees a unique hash code for any Javascript object.
In addition, MerkleJson is efficient in that it only recalculates 
object hashes if the object has no Merkle hash tag. If a Merkle hash
tag is present, its value is returned as the hash value of that object.

### Serialize JSON object
Unlike JSON, MerkleJson serializes objects canonically.

```js
var obj = {
    d:4,
    b:2,
    a:1,
    c:3,
};
console.log(JSON.stringify(obj)); // {"d":4,"b":2,"a":1,"c":3}
var mj = new MerkleJson();
console.log(mj.stringify(obj)); // {"a":1,"b":2,"c":3,"d":4}
```

### Compute hash of JSON object
```js
var mj = new MerkleJson();
var hash = mj.hash({
    size:{
        w:100,
        h:200
    }
}); // e77b735125fec27a61c6f54b17fb6221

var hash = mj.hash({
    size:{ // hash is independent of property order
        h:200
        w:100,
    }
}); // e77b735125fec27a61c6f54b17fb6221
```
### Do not calculate hash if merkleHash is present
```js
var mj = new MerkleJson();
var useMerkleHash = true;
var hash = mj.hash({
    any1: thing1, 
    any2: thing2, 
    any3: thing3, 
}, useMerkleHash); // 441e4f8dabdc6cb17dc9500cee73155b

var hash = mj.hash({
    ... // anything
    merkleHash: e77b735125fec27a61c6f54b17fb6221, 
}, useMerkleHash); // e77b735125fec27a61c6f54b17fb6221

var useMerkleHash = false; // force hash calculation
var hash = mj.hash({
    any1: thing1, 
    any2: thing2, 
    any3: thing3, 
    merkleHash: e77b735125fec27a61c6f54b17fb6221, // ignored
}, useMerkleHash); // 441e4f8dabdc6cb17dc9500cee73155b
```
