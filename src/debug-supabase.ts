// Quick test script to check Supabase connection and data
// Run with: npx tsx src/debug-supabase.ts

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://qlbxagsbbyowrottttiq.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsYnhhZ3NiYnlvd3JvdHR0dGlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4NTU1MTIsImV4cCI6MjA4MzQzMTUxMn0._mGhVKk-Ch77z5aoGGld7DILO7mVwKaIO4JmMude90s";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  console.log("🔍 Testing Supabase connection...\n");

  // Test 1: Check monthly_budgets table
  console.log("1️⃣ Checking monthly_budgets table:");
  const { data: budgets, error: budgetsError } = await supabase
    .from("monthly_budgets")
    .select("*")
    .limit(5);

  if (budgetsError) {
    console.log("   ❌ Error:", budgetsError.message);
    console.log("   📋 Details:", budgetsError);
  } else {
    console.log("   ✅ Found", budgets?.length || 0, "records");
    if (budgets && budgets.length > 0) {
      console.log("   📊 Sample:", JSON.stringify(budgets[0], null, 2));
    }
  }

  // Test 2: Check drivers table
  console.log("\n2️⃣ Checking drivers table:");
  const { data: drivers, error: driversError } = await supabase
    .from("drivers")
    .select("id, first_name, last_name, driver_type")
    .limit(5);

  if (driversError) {
    console.log("   ❌ Error:", driversError.message);
    console.log("   📋 Details:", driversError);
  } else {
    console.log("   ✅ Found", drivers?.length || 0, "records");
    if (drivers && drivers.length > 0) {
      console.log("   📊 Sample:", JSON.stringify(drivers[0], null, 2));
    }
  }

  // Test 3: Check kilometer_rates table
  console.log("\n3️⃣ Checking kilometer_rates table:");
  const { data: rates, error: ratesError } = await supabase
    .from("kilometer_rates")
    .select("*")
    .limit(5);

  if (ratesError) {
    console.log("   ❌ Error:", ratesError.message);
  } else {
    console.log("   ✅ Found", rates?.length || 0, "records");
    if (rates && rates.length > 0) {
      console.log("   📊 Sample:", JSON.stringify(rates[0], null, 2));
    }
  }

  // Test 4: Count 2026 budgets
  console.log("\n4️⃣ Checking 2026 budgets specifically:");
  const { data: budgets2026, error: budgets2026Error } = await supabase
    .from("monthly_budgets")
    .select("*")
    .eq("year", 2026);

  if (budgets2026Error) {
    console.log("   ❌ Error:", budgets2026Error.message);
  } else {
    console.log("   ✅ Found", budgets2026?.length || 0, "records for 2026");

    if (budgets2026 && budgets2026.length > 0) {
      const local = budgets2026.filter((b) => b.driver_type === "local");
      const exportBudgets = budgets2026.filter(
        (b) => b.driver_type === "export",
      );
      console.log("   📊 Local months:", local.length);
      console.log("   📊 Export months:", exportBudgets.length);
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log("If you see '0 records' above, the migrations haven't been run.");
  console.log("If you see errors about permissions, RLS is blocking access.");
  console.log("=".repeat(50));
}

testConnection().catch(console.error);
