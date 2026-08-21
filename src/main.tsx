import{StrictMode}from"react";import{createRoot}from"react-dom/client";import{App}from"./app/App.tsx";
const root=createRoot(document.getElementById("root")!);const demo=new URLSearchParams(location.search).get("demo")==="1";
if(demo)root.render(<StrictMode><App client={null}/></StrictMode>);else import("./lib/supabase.ts").then(({supabase})=>root.render(<StrictMode><App client={supabase}/></StrictMode>)).catch(()=>root.render(<main className="auth-state">Supabase public configuration is missing. Use demo mode or add the local environment file.</main>));
