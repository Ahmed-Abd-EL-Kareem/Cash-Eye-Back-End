import PlanModel from "./plan.model.js";

export const seedPlans = async () => {
  const count = await PlanModel.countDocuments();
  if (count > 0) return;

  await PlanModel.insertMany([
    {
      name: "free",
      displayName: "Explorer",
      description: "Start planning your Egypt adventures",
      price: { monthly: 0 },
      limits: {
        tokensPerMonth: 15000,
        requestsPerDay: 10,
        maxFileUploads: 0,
        maxFileSizeMB: 0,
        allowedModels: ["gpt-3.5-turbo"],
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
      limits: {
        tokensPerMonth: 300000,
        requestsPerDay: 200,
        maxFileUploads: 10,
        maxFileSizeMB: 10,
        allowedModels: ["gpt-3.5-turbo", "gpt-4", "gpt-4-turbo"],
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
};
