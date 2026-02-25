// Test Supabase connection and check for seeded data
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.VITE_SUPABASE_URL || "https://qlbxagsbbyowrottttiq.supabase.co";
const supabaseKey =
  process.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsYnhhZ3NiYnlvd3JvdHR0dGlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4NTU1MTIsImV4cCI6MjA4MzQzMTUxMn0._mGhVKk-Ch77z5aoGGld7DILO7mVwKaIO4JmMude90s";

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log("Testing Supabase connection...\n");
  console.log("URL:", supabaseUrl);
  console.log("");

  try {
    // Test 1: Check monthly_budgets table
    console.log("1. Checking monthly_budgets table...");
    const { data: budgets, error: budgetsError } = await supabase
      .from("monthly_budgets")
      .select("*")
      .eq("year", 2026)
      .order("driver_type")
      .order("month");

    if (budgetsError) {
      console.log("   Error:", budgetsError.message);
    } else if (budgets && budgets.length > 0) {
      console.log(`   Found ${budgets.length} budget records for 2026`);

      // Group by driver type
      const local = budgets.filter((b) => b.driver_type === "local");
      const exports = budgets.filter((b) => b.driver_type === "export");

      console.log(`   - Local budgets: ${local.length} months`);
      console.log(`   - Export budgets: ${exports.length} months`);

      if (local.length > 0) {
        const localTotal = local.reduce(
          (sum, b) => sum + b.budgeted_kilometers,
          0,
        );
        console.log(`   - Local total: ${localTotal.toLocaleString()} km`);
      }
      if (exports.length > 0) {
        const exportTotal = exports.reduce(
          (sum, b) => sum + b.budgeted_kilometers,
          0,
        );
        console.log(`   - Export total: ${exportTotal.toLocaleString()} km`);
      }
    } else {
      console.log(
        "   No budget data found. You need to run the seed migrations.",
      );
    }

    // Test 2: Check drivers table
    console.log("\n2. Checking drivers table...");
    const { data: drivers, error: driversError } = await supabase
      .from("drivers")
      .select("employee_id, first_name, last_name, driver_type, status")
      .order("employee_id");

    if (driversError) {
      console.log("   Error:", driversError.message);
    } else if (drivers && drivers.length > 0) {
      console.log(`   Found ${drivers.length} drivers:`);
      drivers.forEach((d) => {
        console.log(
          `   - ${d.employee_id}: ${d.first_name} ${d.last_name} (${d.driver_type}, ${d.status})`,
        );
      });
    } else {
      console.log("   No drivers found. You need to run the seed migrations.");
    }

    // Test 3: Check kilometer_rates table
    console.log("\n3. Checking kilometer_rates table...");
    const { data: rates, error: ratesError } = await supabase
      .from("kilometer_rates")
      .select("*")
      .eq("is_active", true);

    if (ratesError) {
      console.log("   Error:", ratesError.message);
    } else if (rates && rates.length > 0) {
      console.log(`   Found ${rates.length} active rates:`);
      rates.forEach((r) => {
        console.log(`   - ${r.driver_type}: $${r.rate_per_km}/km`);
      });
    } else {
      console.log("   No active rates found.");
    }

    console.log("\n✅ Connection test complete!");
  } catch (error) {
    console.error("\n❌ Connection failed:", error.message);
  }
}

testConnection();
