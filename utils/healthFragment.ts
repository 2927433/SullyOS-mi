/** Fragment JSON is URI-encoded, not application/x-www-form-urlencoded.
 * Shortcuts may leave a literal + in ISO timezone offsets; never turn it into a space.
 */
export function readHealthFragment(hash:string):string|null{
 for(const part of hash.replace(/^#/,'').split('&')){
  const split=part.indexOf('=');if(split<0)continue;
  if(decodeURIComponent(part.slice(0,split))==='health-import'){
   try{return decodeURIComponent(part.slice(split+1));}catch{throw new Error('健康链接编码不完整，请重新复制完整链接');}
  }
 }
 return null;
}
