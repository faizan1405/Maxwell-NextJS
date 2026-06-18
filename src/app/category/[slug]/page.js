import React from 'react';
import { notFound } from 'next/navigation';
import { connectToDatabase } from '../../../lib/mongoose';
import { Category } from '../../../models/Category';
import { buildPageMetadata } from '../../../lib/seo';
import CategoryLanding from '../../../components/store/CategoryLanding';

export async function generateMetadata({ params }) {
  const { slug } = params;
  
  await connectToDatabase();
  const category = await Category.findOne({ id: slug }).lean();
  
  if (!category || category.status !== 'active') {
    return {};
  }
  
  const title = category.seoTitle || `${category.name} | Amahle Blue`;
  const description = category.seoDescription || category.description || category.blurb || `Shop ${category.name} at Amahle Blue.`;
  
  return buildPageMetadata({
    title,
    description,
    path: `/category/${slug}`,
  });
}

export default async function CategoryDynamicPage({ params }) {
  const { slug } = params;
  
  await connectToDatabase();
  const category = await Category.findOne({ id: slug }).lean();
  
  if (!category || category.status !== 'active') {
    notFound();
  }
  
  // Clean up MongoDB object id
  const safeCategory = {
    ...category,
    _id: category._id?.toString() || null,
  };
  
  return <CategoryLanding category={safeCategory} slug={slug} />;
}
