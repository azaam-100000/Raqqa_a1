
import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import { supabase } from '../services/supabase';

interface ProductCardProps {
  product: Product;
  isOwner: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, isOwner }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (product.image_url) {
      const { data } = supabase.storage.from('uploads').getPublicUrl(product.image_url);
      setImageUrl(data.publicUrl);
    }
  }, [product.image_url]);

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden group">
      <div className="aspect-square w-full bg-slate-700">
        {imageUrl && (
          <img src={imageUrl} alt={product.name} className="w-full h-full object-cover" />
        )}
      </div>
      <div className="p-3">
        <h3 className="font-bold text-white truncate">{product.name}</h3>
        <p className="text-sm text-cyan-400 font-semibold">{product.price.toFixed(2)} $</p>
      </div>
       {/* Placeholder for future edit/delete buttons for the owner */}
       {isOwner && (
           <div className="border-t border-slate-700 p-2 flex justify-end gap-2">
                <button className="text-xs text-slate-400 hover:text-white">تعديل</button>
                <button className="text-xs text-red-400 hover:text-red-300">حذف</button>
           </div>
       )}
    </div>
  );
};

export default ProductCard;
