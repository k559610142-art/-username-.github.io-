# 天地劫資料庫功能接入進度

來源為 2022-01-21.sql，共 213 張表。

遊戲設定與內容表 133 張已可透過 GameDatabase 查詢。營運存檔使用目前遊戲帳號的獨立資料。

## 已接入目前遊戲

角色成長、原始物品定義、裝備限制、完整套裝數值、職業自動學習、技能書學習、全圖與地圖掉落、擊殺獎勵、經驗倍率、武器觸發傷害、指定回復藥水、隨機及固定寶箱、製作配方與材料交易。

## 本機測試伺服器

Node.js + SQLite，網址 http://127.0.0.1:8787 。帳號登入、角色存檔、血盟與金庫／倉庫、組隊邀請、好友、世界聊天、玩家交易、拍賣與郵件附件由同一個本機伺服器保存。此階段角色戰鬥仍由網頁端計算並同步存檔，尚未完成伺服器權威戰鬥。

## 尚待接入

角色權威戰鬥與完整權威存檔、組隊經驗與戰利品分配、任務執行器、完整地圖旅行、地城與首領排程、寵物、攻城戰、競技場、聲望、轉生、完整法術與道具效果。

多人伺服器已依使用者選擇設於本機。剩餘原核心系統仍依下列進度逐項接入。

## 設定表

| 表 | 筆數 | 狀態 |
|---|---:|---|
| accounts | 0 | 營運存檔結構 |
| armor | 1696 | 已匯入設定資料 |
| armor_set | 77 | 已匯入設定資料 |
| ban_ip | 0 | 營運存檔結構 |
| beginner | 42 | 已匯入設定資料 |
| character_alliance | 0 | 營運存檔結構 |
| character_apprentice | 0 | 營運存檔結構 |
| character_bank | 0 | 營運存檔結構 |
| character_buddys | 0 | 營運存檔結構 |
| character_buff | 0 | 營運存檔結構 |
| character_c1 | 0 | 營運存檔結構 |
| character_config | 0 | 營運存檔結構 |
| character_elf_warehouse | 0 | 營運存檔結構 |
| character_etcitems | 0 | 營運存檔結構 |
| character_gambling | 0 | 營運存檔結構 |
| character_item_power | 0 | 營運存檔結構 |
| character_items | 0 | 營運存檔結構 |
| character_items_time | 0 | 營運存檔結構 |
| character_maps_time | 0 | 營運存檔結構 |
| character_other | 0 | 營運存檔結構 |
| character_pets | 0 | 營運存檔結構 |
| character_quests | 0 | 營運存檔結構 |
| character_quests_copy | 0 | 營運存檔結構 |
| character_shop | 0 | 營運存檔結構 |
| character_shopinfo | 0 | 營運存檔結構 |
| character_skills | 0 | 營運存檔結構 |
| character_teleport | 0 | 營運存檔結構 |
| character_teleport_config | 0 | 營運存檔結構 |
| character_vip | 0 | 營運存檔結構 |
| character_warehouse | 0 | 營運存檔結構 |
| character_warehouse_for_cha | 0 | 營運存檔結構 |
| character_wash_chain | 0 | 營運存檔結構 |
| character_weapon_time | 0 | 營運存檔結構 |
| characters | 0 | 營運存檔結構 |
| clan_data | 0 | 營運存檔結構 |
| clan_emblem | 0 | 營運存檔結構 |
| clan_mark_observe | 0 | 營運存檔結構 |
| clan_matching_apclist | 0 | 營運存檔結構 |
| clan_matching_list | 0 | 營運存檔結構 |
| clan_members | 0 | 營運存檔結構 |
| clan_warehouse | 0 | 營運存檔結構 |
| clan_warehouse_history | 0 | 營運存檔結構 |
| commands | 123 | 已匯入設定資料 |
| de_clan | 0 | 營運存檔結構 |
| de_emblem_tmp | 0 | 營運存檔結構 |
| de_name | 0 | 營運存檔結構 |
| de_shopds | 0 | 營運存檔結構 |
| de_shopds_chat | 0 | 營運存檔結構 |
| de_shopds_global | 0 | 營運存檔結構 |
| de_title | 0 | 營運存檔結構 |
| drop_item | 0 | 已匯入設定資料 |
| drop_item_enchant | 48 | 已匯入設定資料 |
| droplist | 12839 | 已匯入設定資料 |
| droplist_map | 5421 | 已匯入設定資料 |
| dungeon | 1838 | 已匯入設定資料 |
| dungeon_random | 10 | 已匯入設定資料 |
| eric_random_mob | 61 | 已匯入設定資料 |
| eric_random_mob_copy | 62 | 已匯入設定資料 |
| eric_startcheckwartime | 8 | 已匯入設定資料 |
| etcitem | 3709 | 已匯入設定資料 |
| etcitem_box | 1283 | 已匯入設定資料 |
| etcitem_box_key | 0 | 已匯入設定資料 |
| etcitem_boxs | 122 | 已匯入設定資料 |
| etcitem_doll_power | 306 | 已匯入設定資料 |
| etcitem_doll_type | 212 | 已匯入設定資料 |
| etcitem_teleport | 365 | 已匯入設定資料 |
| exp | 101 | 已匯入設定資料 |
| ez_金流比值器 | 1 | 已匯入設定資料 |
| ezpay | 0 | 營運存檔結構 |
| ezpay_accumulation | 0 | 營運存檔結構 |
| ezpay_bonus | 0 | 營運存檔結構 |
| ezpay_first | 0 | 營運存檔結構 |
| getback | 514 | 已匯入設定資料 |
| getback_restart | 264 | 已匯入設定資料 |
| inn | 0 | 營運存檔結構 |
| inn_key | 0 | 營運存檔結構 |
| item_upgrade | 0 | 已匯入設定資料 |
| mails | 0 | 營運存檔結構 |
| mapids | 735 | 已匯入設定資料 |
| mapids_exp | 7 | 已匯入設定資料 |
| mapids_group | 16 | 已匯入設定資料 |
| mapids_level | 6 | 已匯入設定資料 |
| mobgroup | 85 | 已匯入設定資料 |
| mobskill | 4383 | 已匯入設定資料 |
| npc | 4812 | 已匯入設定資料 |
| npc_copy | 4720 | 已匯入設定資料 |
| npcaction | 1001 | 已匯入設定資料 |
| npcaction_teleport | 161 | 已匯入設定資料 |
| npcaction_teleport_copy | 150 | 已匯入設定資料 |
| npcchat | 46 | 已匯入設定資料 |
| npcscore | 0 | 已匯入設定資料 |
| other_chat | 0 | 營運存檔結構 |
| other_cn_shop | 0 | 營運存檔結構 |
| other_enchant | 0 | 營運存檔結構 |
| other_gmcommand | 0 | 營運存檔結構 |
| other_pcbuy | 0 | 營運存檔結構 |
| other_pcsell | 0 | 營運存檔結構 |
| other_pctrade | 0 | 營運存檔結構 |
| other_shifting | 0 | 營運存檔結構 |
| other_timeuser | 0 | 營運存檔結構 |
| other_topc | 0 | 營運存檔結構 |
| petitem | 18 | 已匯入設定資料 |
| pettypes | 55 | 已匯入設定資料 |
| polymorphs | 810 | 已匯入設定資料 |
| race_bighotbling | 0 | 營運存檔結構 |
| race_mobbling | 0 | 營運存檔結構 |
| resolvent | 282 | 已匯入設定資料 |
| server_board | 0 | 已匯入設定資料 |
| server_board_auction | 0 | 營運存檔結構 |
| server_board_orim | 0 | 營運存檔結構 |
| server_c1_name | 2 | 已匯入設定資料 |
| server_c1_name_type | 16 | 已匯入設定資料 |
| server_castle | 8 | 已匯入設定資料 |
| server_castle_war_gift | 8 | 已匯入設定資料 |
| server_event | 31 | 已匯入設定資料 |
| server_event_spawn | 23 | 已匯入設定資料 |
| server_fishing | 28 | 已匯入設定資料 |
| server_house | 129 | 已匯入設定資料 |
| server_info | 0 | 營運存檔結構 |
| server_item_power | 14 | 已匯入設定資料 |
| server_item_power_update | 0 | 營運存檔結構 |
| server_item_restrictions | 9 | 已匯入設定資料 |
| server_item_time | 58 | 已匯入設定資料 |
| server_item_time_copy | 41 | 已匯入設定資料 |
| server_item_update | 3 | 已匯入設定資料 |
| server_mary | 0 | 營運存檔結構 |
| server_message | 4 | 已匯入設定資料 |
| server_msg_item_id | 437 | 已匯入設定資料 |
| server_quest | 45 | 已匯入設定資料 |
| server_quest_maps | 35 | 已匯入設定資料 |
| server_quest_spawn | 848 | 已匯入設定資料 |
| server_shopx | 0 | 已匯入設定資料 |
| server_town | 10 | 已匯入設定資料 |
| server_wash_chain_enchanting | 525 | 已匯入設定資料 |
| server_wash_chain_enchanting_name | 75 | 已匯入設定資料 |
| shop | 3793 | 已匯入設定資料 |
| shop_cn | 106 | 已匯入設定資料 |
| shop_cn_bonus | 0 | 已匯入設定資料 |
| skills | 808 | 已匯入設定資料 |
| skills_harm_strengthen | 10 | 已匯入設定資料 |
| skills_item | 219 | 已匯入設定資料 |
| spawnlist | 5814 | 已匯入設定資料 |
| spawnlist_blackknight | 51 | 已匯入設定資料 |
| spawnlist_boss | 308 | 已匯入設定資料 |
| spawnlist_door | 600 | 已匯入設定資料 |
| spawnlist_furniture | 0 | 已匯入設定資料 |
| spawnlist_light | 169 | 已匯入設定資料 |
| spawnlist_npc | 1911 | 已匯入設定資料 |
| spawnlist_scenery | 551 | 已匯入設定資料 |
| spawnlist_time | 0 | 已匯入設定資料 |
| spawnlist_trap | 185 | 已匯入設定資料 |
| spawnlist_ub | 1116 | 已匯入設定資料 |
| spr_action | 36706 | 已匯入設定資料 |
| spr_action_copy_copy | 29774 | 已匯入設定資料 |
| system_attr_weapon | 55 | 已匯入設定資料 |
| system_cash_bonus | 0 | 營運存檔結構 |
| system_cash_first | 0 | 營運存檔結構 |
| system_cash_user | 0 | 營運存檔結構 |
| system_castle_skill | 8 | 已匯入設定資料 |
| system_custom_text | 1 | 已匯入設定資料 |
| system_etcitem_hpmp | 3 | 已匯入設定資料 |
| system_firesmith_crystal | 112 | 已匯入設定資料 |
| system_item_blend | 1264 | 已匯入設定資料 |
| system_item_drop | 40 | 已匯入設定資料 |
| system_item_give | 55 | 已匯入設定資料 |
| system_item_npc | 26 | 已匯入設定資料 |
| system_message | 154 | 已匯入設定資料 |
| system_mysql_send | 0 | 營運存檔結構 |
| system_npcdiespawn | 0 | 已匯入設定資料 |
| system_poly_orginal | 59 | 已匯入設定資料 |
| system_poly_orginal_copy | 0 | 已匯入設定資料 |
| system_potion_enchant | 29 | 已匯入設定資料 |
| system_reward | 29 | 已匯入設定資料 |
| system_transform | 0 | 已匯入設定資料 |
| system_turn_reward | 10 | 已匯入設定資料 |
| system_vip_db | 0 | 營運存檔結構 |
| system_vulcan_refinery | 613 | 已匯入設定資料 |
| system_weapon_boss | 80 | 已匯入設定資料 |
| trap | 52 | 已匯入設定資料 |
| ub_managers | 10 | 已匯入設定資料 |
| ub_rank | 0 | 營運存檔結構 |
| ub_settings | 5 | 已匯入設定資料 |
| ub_supplies | 4 | 已匯入設定資料 |
| ub_times | 0 | 已匯入設定資料 |
| weapon | 520 | 已匯入設定資料 |
| weapon_power | 1 | 已匯入設定資料 |
| weapon_skill | 22 | 已匯入設定資料 |
| weapon_skill_in | 148 | 已匯入設定資料 |
| weapon_skill_power | 71 | 已匯入設定資料 |
| 日誌_玩家_回報_問題 | 0 | 營運存檔結構 |
| 自動學習技能設置 | 23 | 已匯入設定資料 |
| 即時等級獎勵系統 | 36 | 已匯入設定資料 |
| 每日副本任務系統 | 2 | 已匯入設定資料 |
| 使用內掛被玩家殺死名單 | 0 | 營運存檔結構 |
| 怪物掉落全圖設置 | 3 | 已匯入設定資料 |
| 怪物擊殺獎勵系統 | 6 | 已匯入設定資料 |
| 限制寶箱掉落系統 | 51 | 已匯入設定資料 |
| 強化武器加成系統 | 20 | 已匯入設定資料 |
| 排除加速偵測名單 | 0 | 已匯入設定資料 |
| 祭司能力設置 | 4 | 已匯入設定資料 |
| 循環說話設置 | 21 | 已匯入設定資料 |
| 暗黑系統_防具 | 11 | 已匯入設定資料 |
| 暗黑系統_武器 | 17 | 已匯入設定資料 |
| 暗黑系統_紀錄 | 0 | 營運存檔結構 |
| 暗黑系統_飾品 | 12 | 已匯入設定資料 |
| 禁止伺服語言 | 0 | 已匯入設定資料 |
| 道具特化系統 | 31 | 已匯入設定資料 |
| 道具顯示說明 | 584 | 已匯入設定資料 |
| 衝裝贖回記錄 | 0 | 營運存檔結構 |
| 聲望能力系統 | 16 | 已匯入設定資料 |
| 聲望能力獵取設置 | 253 | 已匯入設定資料 |
| 驗證ai地圖設置 | 689 | 已匯入設定資料 |
| 驗證ai特效設置 | 5 | 已匯入設定資料 |