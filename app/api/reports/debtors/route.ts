import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

type GroupTotals = Record<string, number>;

function aggregateTotals(entries: { customerId: string | null; _sum: { totalCents: number | null } }[]): GroupTotals {
    return entries.reduce<GroupTotals>((acc, entry) => {
        if (!entry.customerId) {
            return acc;
        }

        const total = entry._sum.totalCents ?? 0;
        acc[entry.customerId] = (acc[entry.customerId] ?? 0) + total;
        return acc;
    }, {});
}

export async function GET() {
    try {
        const pendingTotals = await prisma.order.groupBy({
            by: ["customerId"],
            where: {
                customerId: {
                    not: null,
                },
                status: "pending",
                paymentMethod: {
                    not: "ficha_payment",
                },
            },
            _sum: {
                totalCents: true,
            },
        });

        if (pendingTotals.length === 0) {
            return NextResponse.json({ data: [] });
        }

        const paymentTotals = await prisma.order.groupBy({
            by: ["customerId"],
            where: {
                customerId: {
                    not: null,
                },
                paymentMethod: "ficha_payment",
            },
            _sum: {
                totalCents: true,
            },
        });

        const pendingMap = aggregateTotals(pendingTotals);
        const paymentMap = aggregateTotals(paymentTotals);

        const customerIds = Object.keys(pendingMap);

        const customers = await prisma.customer.findMany({
            where: {
                id: {
                    in: customerIds,
                },
            },
            select: {
                id: true,
                name: true,
                phone: true,
            },
        });

        const customerIndex = new Map(customers.map((customer) => [customer.id, customer]));

        const debtors = customerIds
            .map((customerId) => {
                const customer = customerIndex.get(customerId);
                if (!customer) {
                    return null;
                }

                const pendingCents = pendingMap[customerId] ?? 0;
                const paymentsCents = paymentMap[customerId] ?? 0;
                const balanceCents = pendingCents - paymentsCents;

                if (balanceCents <= 0) {
                    return null;
                }

                return {
                    customerId,
                    name: customer.name,
                    phone: customer.phone,
                    pendingCents,
                    paymentsCents,
                    balanceCents,
                };
            })
            .filter((entry) => entry !== null)
            .sort((a, b) => b.balanceCents - a.balanceCents);

        return NextResponse.json({ data: debtors });
    } catch (error) {
        console.error("Error fetching top debtors:", error);
        return NextResponse.json({ error: "Failed to fetch top debtors" }, { status: 500 });
    }
}
