import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  const client = await clientPromise;
  const db = client.db("laundry");

  const data = await db.collection("transactions").aggregate([
    {
      $group: {
        _id: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: "$createdAt",
          },
        },
        total: { $sum: "$amount" },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]).toArray();

  return NextResponse.json(
    data.map(d => ({
      date: d._id,
      total: d.total,
    }))
  );
}