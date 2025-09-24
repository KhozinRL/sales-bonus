/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
   return purchase.sale_price * (1 - purchase.discount / 100) * purchase.quantity ;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    let bonusMultiplyer;
    switch (index) {
        case 0: 
            bonusMultiplyer = 0.15; 
            break;
        case 1:
        case 2:    
            bonusMultiplyer = 0.1; 
            break;
        case total - 1: 
            bonusMultiplyer = 0; 
            break;
        default: 
            bonusMultiplyer = 0.05; 
            break;
    }

    return seller.profit * bonusMultiplyer;
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    if (
        !data || 
        !Array.isArray(data.sellers) || data.sellers.length === 0 || 
        !Array.isArray(data.products) || data.products.length === 0 ||
        !Array.isArray(data.customers) || data.customers.length === 0 || 
        !Array.isArray(data.purchase_records) || data.purchase_records.length === 0
    ) {
        throw new Error("Некорректные входные данные")
    }

    const { calculateRevenue, calculateBonus } = options;

    // Подготовка промежуточных данных для сбора статистики
    const sellerStats = data.sellers.map(seller => ({
        id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {}
    })); 

    // Индексация продавцов и товаров для быстрого доступа
    const sellerStatsById = sellerStats.reduce((index, seller) => ({...index, [seller.id]: seller}), {});
    const productsBySku = data.products.reduce((index, product) => ({...index, [product.sku]: product}), {});

    // Расчет выручки и прибыли для каждого продавца
    for (let purchaseRecord of data.purchase_records) {
        const sellerStats = sellerStatsById[purchaseRecord.seller_id];

        for (let purchaseItem of purchaseRecord.items) {
            const product = productsBySku[purchaseItem.sku];
            const productRevenue = calculateRevenue(purchaseItem, product);
            sellerStats.profit += productRevenue - product.purchase_price * purchaseItem.quantity;

            if (!sellerStats.products_sold[purchaseItem.sku]) {
                sellerStats.products_sold[purchaseItem.sku] = 0;
            }
            sellerStats.products_sold[purchaseItem.sku]++;
        }
        
        sellerStats.revenue += purchaseRecord.total_amount;
        sellerStats.sales_count++;
    }

    // Сортировка продавцов по прибыли
    const sellersSorted = [...sellerStats].sort((a, b) => a.profit - b.profit).reverse();

    // Назначение премий на основе ранжирования
    sellersSorted.forEach((seller, index) => {
        seller.bonus = calculateBonus(index, sellersSorted.length, seller);
        seller.top_products = Object.entries(seller.products_sold).map(item => ({sku: item[0], quantity: item[1]})).sort(
            (a, b) => a.quantity - b.quantity).reverse().slice(0, 10);
    })

    // Подготовка итоговой коллекции с нужными полями
    return sellersSorted.map(seller => ({
        seller_id: seller.id,
        name: seller.name,
        revenue: +seller.revenue.toFixed(2),
        profit: +seller.profit.toFixed(2),
        sales_count: seller.sales_count,
        top_products: seller.top_products,
        bonus: +seller.bonus.toFixed(2)
    }));
}
