// _data/projects.js
module.exports = async function() {
  const ACCESS_TOKEN = process.env.CONTENTFUL_ACCESS_TOKEN;
  const SPACE_NAME = process.env.CONTENTFUL_SPACE_NAME;
  const API_URL = "https://cdn.contentful.com/spaces/" + SPACE_NAME + "/environments/master/entries?content_type=project";


  try {
    // For local testing, replace fetch with direct JSON parsing
    const response = await fetch(`${API_URL}&access_token=${ACCESS_TOKEN}`);
    const data = await response.json();

    const items = data.items || [];
    const assets = data.includes?.Asset || [];

    // Map asset IDs to their URLs for quick lookup
    const assetMap = new Map();
    assets.forEach(asset => {
      if (asset.sys?.id && asset.fields?.file?.url) {
        // Ensure standard https protocol prefix
        let url = asset.fields.file.url;
        if (url.startsWith("//")) {
          url = `https:${url}`;
        }
        assetMap.set(asset.sys.id, {
          url,
          title: asset.fields.title || "",
          alt: asset.fields.description || asset.fields.title || ""
        });
      }
    });

    // Helper to extract text from Contentful Rich Text nodes
    function extractRichText(richTextObj) {
      if (!richTextObj || !richTextObj.content) return "";
      return richTextObj.content
        .map(paragraph => {
          if (!paragraph.content) return "";
          return paragraph.content.map(node => node.value || "").join("");
        })
        .filter(Boolean)
        .join("\n\n");
    }

    // Normalize entries into clean JSON objects for 11ty templates
    return items.map(item => {
      const fields = item.fields || {};
      const heroAssetId = fields.heroImage?.sys?.id;

      return {
        id: item.sys.id,
        title: fields.title || "Untitled Project",
        status: fields.status || "Unknown",
        categories: fields.categories || [],
        description: extractRichText(fields.description),
        isFeatured: fields.isFeatured || false,
        location: fields.location || null,
        heroImage: heroAssetId ? assetMap.get(heroAssetId) : null,
        galleryImages: (fields.images || [])
          .map(img => assetMap.get(img.sys?.id))
          .filter(Boolean),
        seo: {
          title: fields.seoMetaTitle || fields.title,
          description: fields.seoMetaDescription || ""
        }
      };
    });
  } catch (error) {
    console.error("Error parsing Contentful data:", error);
    return [];
  }
};