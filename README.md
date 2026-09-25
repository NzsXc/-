(async () => {
  const passcode = prompt("追加するユーザーのパスコード");
  if (!passcode) return;
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(passcode)
  );
  const hex = Array.from(new Uint8Array(digest),
    b => b.toString(16).padStart(2, "0")
  ).join("");
  console.log(`player-${hex.slice(0, 24)}@psy-login.local`);
})();



(async()=>{const passcode=prompt("追加するユーザーのパスコード");if(!passcode)return;const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(passcode));const hex=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,"0")).join("");console.log("player-"+hex.slice(0,24)+"@psy-login.local");})();
