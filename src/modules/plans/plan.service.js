import PlanModel from "./plan.model";

export const seedPlans = async () => {
  const count = await PlanModel.countDocuments();
  if (count > 0) return;

  await PlanModel.insertMany([
    {
      name: "free",
      displayName: "Free",
      description: "Get started with basic AI financial insights",
      price: { monthly: 0 },
      limits: {
        tokensPerMonth: 10000,
        requestsPerDay: 20,
        maxFileUploads: 2,
        maxFileSizeMB: 5,
        allowedModels: ["gpt-3.5-turbo"],
      },
      features: ["Basic financial analysis", "20 requests/day", "2 file uploads"],
      sortOrder: 0,
    },
    {
      name: "pro",
      displayName: "Pro",
      description: "Full AI advisor for growing businesses",
      price: { monthly: 29 },
      limits: {
        tokensPerMonth: 500000,
        requestsPerDay: 500,
        maxFileUploads: 50,
        maxFileSizeMB: 25,
        allowedModels: ["gpt-3.5-turbo", "gpt-4", "gpt-4-turbo"],
      },
      features: [
        "Advanced AI forecasting",
        "500 requests/day",
        "50 file uploads",
        "Risk analysis",
        "Priority support",
      ],
      sortOrder: 1,
    },
  ]);

  console.log(" Plans seeded");
};