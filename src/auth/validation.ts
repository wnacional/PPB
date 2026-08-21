export const validateEmail=(v:string)=>{const e=v.trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))throw Error("Enter a valid email address.");return e};
export const validatePassword=(v:string)=>{if(v.length<8)throw Error("Password must contain at least 8 characters.");return v};
