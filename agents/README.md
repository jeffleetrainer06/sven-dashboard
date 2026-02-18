# Multi-Agent Workflows for Jeff Lee - Pedersen Toyota

## Overview
These agents power the Workflow Studio for vehicle matching, recommendations, and competitive analysis.

## Workflows

### 1. `/recommend` - New Toyota Recommendations
Agents: Qualifier → Inventory → Sales → Verifier

### 2. `/match` - Used Vehicle Match  
Agents: Qualifier → Scraper → Matcher → Calculator → Presenter → Verifier

### 3. `/compare` - Competitive Analysis
Agents: Collector → Standardizer → Analyst → Recommender → Verifier

## Data Sources
- **Used Inventory:** https://www.pedersentoyota.com/searchused.aspx
- **New Inventory:** https://www.pedersentoyota.com/searchnew.aspx
- **SmartPath:** https://smartpath.pedersentoyota.com/inventory?dealerCd=05030

## Dealership Info
- **Tax Rate:** 8.30% (Fort Collins)
- **Doc Fee:** $689.50
- **Title Fee:** $7.20
- **Registration:** ~$300
- **Total Fees:** $996.70

## Payment Calculation
```
Monthly = (Vehicle Price + Tax + Fees - Trade Equity - Down Payment) / Term
Standard rates: 60mo @ 5.99%, 72mo @ 6.49%, 84mo @ 6.99%
```
