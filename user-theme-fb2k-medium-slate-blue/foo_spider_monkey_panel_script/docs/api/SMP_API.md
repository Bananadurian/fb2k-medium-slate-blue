static NotifyOthers(name, info)

This will trigger on_notify_data(name, info) in other panels.
!!! Beware !!!: data passed via `info` argument must NOT be used or modified in the source panel after invoking this method.

Parameters:
Name	Type	Description
name	string	
info	*	

Example

```js
let data = { 
   // some data
};
window.NotifyOthers('have_some_data', data);

data = null; // stop using the object immediately
// AddSomeAdditionalValues(data); // don't try to modify it, since it will affect the object in the other panel as well
static Reload()
```

inner on_notify_data(name, info)

Called in other panels after window.NotifyOthers is executed.

!!! Beware !!!
1. Data from `info` argument is only accessible inside `on_notify_data` callback: if stored and accessed outside of the callback it will throw JS error.
This also applies to the data produced from that `info`: e.g. storing `info.Path` directly (if `info` is FbMetadbHandle).
2. If you want to store the data from `info` you have to perform a deep copy:
- `String(info)` for strings.
- `JSON.parse(JSON.stringify(info))` for serializable objects.
- `new ObjectType(info)` for objects that have an approppriate constructor available, e.g. `new GdiBitmap(info)` or `new FbMetadbHandleList(info)`.
3. `info` argument is shared between panels, so it should NOT be modified in any way.

Parameters:
Name	Type	Description
name	string	
info	*