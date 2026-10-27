"use server";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {registrationInput} from "@/lib/commerce/merchant-registration";
export async function registerBusiness(form:FormData){
  let input;
  try{input=registrationInput(form);}catch(error){redirect("/merchant/register?error="+encodeURIComponent(error instanceof Error?error.message:"Revisa los datos."));}
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect("/login");
  const {error}=await supabase.rpc("register_merchant_business",input);
  if(error)redirect("/merchant/register?error="+encodeURIComponent(error.message));
  redirect("/merchant?registered=1");
}
