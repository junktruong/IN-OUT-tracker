"use client";

import { useCallback, useEffect, useState } from "react";

import type { CategoryDTO } from "@/lib/types";

export function useCategories(active = true) {
  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [loading, setLoading] = useState(false);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/categories", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("failed");
      }

      const data = (await response.json()) as { items?: CategoryDTO[] };
      setCategories(data.items ?? []);
    } catch {
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!active) {
      return;
    }

    void loadCategories();
  }, [active, loadCategories]);

  return { categories, loading, reload: loadCategories };
}
