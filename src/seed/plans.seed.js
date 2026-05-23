import PlanModel from "../modules/subscriptions/plan.model.js";

export const seedPlans = async () => {
  const count = await PlanModel.countDocuments();
  if (count > 0) return;

  await PlanModel.insertMany([
    {
      name: "free",
      displayName: "Free",
      description: "Explore Egypt with basic AI trip planning",
      price: { monthly: 0 },
      limits: {
        tokensPerMonth: 10000,
        requestsPerDay: 20,
        maxFileUploads: 2,
        maxFileSizeMB: 5,
        allowedModels: ["gpt-3.5-turbo"],
      },
      features: ["Basic trip ideas", "20 AI requests/day", "Saved trips"],
      sortOrder: 0,
    },
    {
      name: "pro",
      displayName: "Pro",
      description: "Full Rahal AI planner for serious travelers",
      price: { monthly: 29 },
      limits: {
        tokensPerMonth: 500000,
        requestsPerDay: 500,
        maxFileUploads: 50,
        maxFileSizeMB: 25,
        allowedModels: ["gpt-3.5-turbo", "gpt-4", "gpt-4-turbo"],
      },
      features: [
        "Advanced AI itineraries",
        "Hotel recommendations",
        "Booking assistant",
        "500 AI requests/day",
        "Priority support",
      ],
      sortOrder: 1,
    },
  ]);

  console.log("Plans seeded for Rahal");
};

export default seedPlans;
