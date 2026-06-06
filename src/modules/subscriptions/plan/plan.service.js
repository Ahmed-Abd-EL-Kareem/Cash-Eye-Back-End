import PlanModel from "./plan.model.js";

export const seedPlans = async () => {
  const count = await PlanModel.countDocuments();
  if (count === 0) {
    await PlanModel.insertMany([
      {
        name: "free",
        displayName: "Explorer",
        description: "Start planning your Egypt adventures",
        price: { monthly: 0 },
        limits: {
          tokensPerMonth: 15000,
          requestsPerDay: 10,
          tripsPerMonth: 3,
          maxFileUploads: 0,
          maxFileSizeMB: 0,
          allowedModels: ["nvidia/nemotron-3-super-120b-a12b", "gpt-4o-mini"],
        },
        features: [
          "3 AI trip plans per month",
          "Browse destinations & hotels",
          "Basic AI chatbot",
        ],
        sortOrder: 0,
      },
      {
        name: "pro",
        displayName: "Traveler",
        description: "Unlimited AI travel planning across Egypt",
        price: { monthly: 19 },
        stripePriceId: {
          monthly: process.env.STRIPE_PRICE_ID_PRO || null,
        },
        limits: {
          tokensPerMonth: 300000,
          requestsPerDay: 200,
          tripsPerMonth: null,
          maxFileUploads: 10,
          maxFileSizeMB: 10,
          allowedModels: ["nvidia/nemotron-3-super-120b-a12b", "gpt-4o-mini", "gpt-4", "gpt-4-turbo"],
        },
        features: [
          "Unlimited AI trip plans",
          "RAG-powered travel knowledge",
          "Priority AI chatbot",
          "Hotel booking requests",
          "Save unlimited trips",
        ],
        sortOrder: 1,
      },
    ]);

    console.log("✅ Rahal plans seeded");
  }

  if (process.env.STRIPE_PRICE_ID_PRO) {
    await PlanModel.updateOne(
      { name: "pro" },
      { $set: { "stripePriceId.monthly": process.env.STRIPE_PRICE_ID_PRO } }
    );
  }
};
