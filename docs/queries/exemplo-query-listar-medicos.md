SELECT 
    d.id,
    d.user_id,
    d.name,
    u.email,
    u.phone,
    d.crm
FROM doctors d
LEFT JOIN users u ON u.id = d.user_id
WHERE d.name IS NOT NULL 
  AND d.name NOT ILIKE '%teste%'
ORDER BY d.name