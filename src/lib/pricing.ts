export function isSpicyBypassed(category: string, branchCode: string, isRisoles = false) {
  const cleanCategory = category?.toLowerCase() || "";
  if (branchCode === "CABANG_2") {
    return cleanCategory === "tea series" || cleanCategory === "delight series" || cleanCategory === "chocolatte";
  } else {
    // Cabang 1
    if (isRisoles) return false;
    return cleanCategory === "snack" || cleanCategory === "qalla coffee" || cleanCategory === "qalla tea" || cleanCategory === "qalla juice";
  }
}

export function calculateSpicySurcharge(level: number, category: string, branchCode: string, isRisoles = false) {
  const bypassed = isSpicyBypassed(category, branchCode, isRisoles);
  if (bypassed) return 0;
  return (level === 4 || level === 5) ? 2000 : 0;
}

export function calculateToppingsSurcharge(toppings: string[], branchCode: string, category?: string) {
  const cleanCategory = category?.toLowerCase() || "";
  if (cleanCategory === "lumpia beef" || cleanCategory === "kebab") {
    const kejuCount = toppings.filter((t) => t === "Keju").length;
    return kejuCount * 3000;
  }

  const isCabang2 = branchCode === "CABANG_2";
  const premiumKeys = isCabang2 ? ["Telur"] : ["Telur", "Keju Slice"];
  const specialKeys = isCabang2 
    ? ["Ceker", "Kulit Ayam", "Pangsit Goreng"] 
    : ["Beef Slice"];

  const premiumToppings = toppings.filter((t) => premiumKeys.includes(t));
  const specialToppings = toppings.filter((t) => specialKeys.includes(t));
  const promoToppings = toppings.filter((t) => !premiumKeys.includes(t) && !specialKeys.includes(t));

  // Calculate Promo/Standard Toppings with greedy logic (groups of 7 for 10k, groups of 3 for 5k, rest 2k each)
  let promoSurcharge = 0;
  let remCount = promoToppings.length;

  const sevens = Math.floor(remCount / 7);
  promoSurcharge += sevens * 10000;
  remCount %= 7;

  const threes = Math.floor(remCount / 3);
  promoSurcharge += threes * 5000;
  remCount %= 3;

  promoSurcharge += remCount * 2000;

  // Calculate Special Toppings (Rp 2.500 each)
  const specialSurcharge = specialToppings.length * 2500;

  // Calculate Premium Toppings (Telur +5k, Keju Slice +3k)
  let premiumSurcharge = 0;
  premiumToppings.forEach((t) => {
    if (t === "Telur") premiumSurcharge += 5000;
    else if (t === "Keju Slice") premiumSurcharge += 3000;
  });

  return promoSurcharge + specialSurcharge + premiumSurcharge;
}

export function calculateFillingSurcharge(category: string, size: string | undefined, filling: string | undefined) {
  if (!filling) return 0;
  const cleanCategory = category?.toLowerCase() || "";
  if (cleanCategory === 'kebab') {
    if (size === 'REGULER') {
      if (filling === 'Beef' || filling === 'Chicken') return 2000;
    } else if (size === 'LARGE') {
      if (filling === 'Beef Slice' || filling === 'Beef' || filling === 'Chicken Katsu' || filling === 'Chicken') return 5000;
      if (filling === 'Special') return 10000;
    }
  } else if (cleanCategory === 'lumpia beef') {
    if (filling === 'Beef Patty') return 4000;
    if (filling === 'Chicken Katsu' || filling === 'Telur Dadar') return 5000;
    if (filling === 'Special') return 10000;
  }
  return 0;
}

export function calculateSpaghettiSurcharge(name: string, size: string | undefined) {
  const isSpaghetti = name?.toLowerCase().includes("spaghetti");
  return (isSpaghetti && size === "Double") ? 5000 : 0;
}

export function calculateItemUnitPrice(
  basePrice: number,
  category: string,
  name: string,
  options: {
    spicyLevel?: number;
    toppings?: string[];
    filling?: string;
    size?: string;
  },
  branchCode: string
) {
  const isRisoles = name?.toLowerCase().includes("risoles");
  const bypassed = isSpicyBypassed(category, branchCode, isRisoles);
  if (bypassed) return basePrice;
  
  const spicySurcharge = calculateSpicySurcharge(options.spicyLevel ?? 0, category, branchCode, isRisoles);
  
  const toppingsSurcharge = calculateToppingsSurcharge(options.toppings ?? [], branchCode, category);

  const fillingSurcharge = calculateFillingSurcharge(category, options.size, options.filling);
  const spaghettiSurcharge = calculateSpaghettiSurcharge(name, options.size);

  return basePrice + spicySurcharge + toppingsSurcharge + fillingSurcharge + spaghettiSurcharge;
}
