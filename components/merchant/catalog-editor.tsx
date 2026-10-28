"use client";

import { useEffect, useState } from "react";

type CatalogItem={
  id:string;
  title:string;
  description:string;
  price:string;
  available:boolean;
};

const seed:CatalogItem[]=[];

export default function CatalogEditor(){
  const [items,setItems]=useState<CatalogItem[]>(seed);
  const [saved,setSaved]=useState(false);

  useEffect(()=>{
    try{
      const stored=localStorage.getItem("navibori:merchant-catalog");
      if(stored) setItems(JSON.parse(stored));
    }catch{}
  },[]);

  function addItem(){
    setSaved(false);
    setItems((current)=>[
      ...current,
      {id:"item-"+Date.now(),title:"",description:"",price:"",available:true}
    ]);
  }

  function updateItem(id:string,key:keyof Omit<CatalogItem,"id">,value:string|boolean){
    setSaved(false);
    setItems((current)=>current.map((item)=>item.id===id?{...item,[key]:value}:item));
  }

  function removeItem(id:string){
    setSaved(false);
    setItems((current)=>current.filter((item)=>item.id!==id));
  }

  function save(){
    localStorage.setItem("navibori:merchant-catalog",JSON.stringify(items));
    window.dispatchEvent(new Event("navibori:merchant-catalog-updated"));
    setSaved(true);
  }

  return (
    <section className="merchant-catalog-editor">
      <div className="merchant-section-head">
        <div>
          <p className="eyebrow">CATÁLOGO</p>
          <h2>Productos y servicios</h2>
        </div>
        <button type="button" onClick={addItem}>Añadir</button>
      </div>

      <div className="merchant-catalog-list">
        {items.map((item)=>(
          <article key={item.id}>
            <input
              aria-label="Nombre del producto o servicio"
              placeholder="Nombre"
              value={item.title}
              onChange={(e)=>updateItem(item.id,"title",e.target.value)}
            />
            <input
              aria-label="Descripción"
              placeholder="Descripción"
              value={item.description}
              onChange={(e)=>updateItem(item.id,"description",e.target.value)}
            />
            <input
              aria-label="Precio"
              inputMode="decimal"
              placeholder="Precio"
              value={item.price}
              onChange={(e)=>updateItem(item.id,"price",e.target.value)}
            />
            <label className="merchant-availability">
              <input
                type="checkbox"
                checked={item.available}
                onChange={(e)=>updateItem(item.id,"available",e.target.checked)}
              />
              Disponible
            </label>
            <button type="button" onClick={()=>removeItem(item.id)}>Eliminar</button>
          </article>
        ))}
        {items.length===0 && <p className="merchant-empty">Añade tu primer producto o servicio.</p>}
      </div>

      <div className="merchant-actions">
        <button type="button" onClick={save}>Guardar catálogo local</button>
        {saved && <span role="status">Catálogo guardado.</span>}
      </div>
    </section>
  );
}
