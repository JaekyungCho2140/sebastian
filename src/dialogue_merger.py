"""M4/GL DIALOGUE 병합"""
import os
import pandas as pd
from datetime import datetime
from src.excel_formatter import ExcelFormatter


class DialogueMerger:
    """DIALOGUE 테이블 병합 클래스"""

    def __init__(self):
        """DialogueMerger 초기화"""
        self.formatter = ExcelFormatter()

    def merge_dialogue(self, folder_path):
        """DIALOGUE 파일 병합

        Args:
            folder_path: DIALOGUE 파일이 있는 폴더 경로

        Returns:
            dict: 병합 결과 (success, output_file, row_count)
        """
        try:
            # 1. CINEMATIC_DIALOGUE 읽기
            cinematic_path = os.path.join(folder_path, "CINEMATIC_DIALOGUE.xlsm")
            cinematic_df = pd.read_excel(
                cinematic_path,
                sheet_name=1,  # 2번째 시트 (0-based)
                header=1,  # 2행이 헤더 (0-based)
                skiprows=list(range(2, 9))  # 3-9행 건너뛰기 (데이터는 10행부터)
            )

            # 2. SMALLTALK_DIALOGUE 읽기
            smalltalk_path = os.path.join(folder_path, "SMALLTALK_DIALOGUE.xlsm")
            smalltalk_df = pd.read_excel(
                smalltalk_path,
                sheet_name=1,
                header=1,
                skiprows=list(range(2, 4))  # 3-4행 건너뛰기 (데이터는 5행부터)
            )

            # 3. NPC 매핑 읽기
            npc_path = os.path.join(folder_path, "NPC.xlsm")
            npc_df = pd.read_excel(npc_path, sheet_name="NPC", header=1)
            npc_df = npc_df.dropna(subset=[npc_df.columns[7]])  # NPC ID 열
            npc_df = npc_df.drop_duplicates(subset=[npc_df.columns[7]])
            npc_map = dict(zip(npc_df.iloc[:, 7], npc_df.iloc[:, 9]))

            # 4. 데이터 병합 (CINEMATIC + SMALLTALK)
            merged_df = pd.concat([cinematic_df, smalltalk_df], ignore_index=True)

            # 5. Speaker Name 채우기
            if "NPC ID" in merged_df.columns and "Speaker Name" in merged_df.columns:
                merged_df["Speaker Name"] = merged_df["NPC ID"].map(npc_map).fillna(merged_df["NPC ID"])

            # 6. EN (M) 열 기준 필터링
            if "EN (M)" in merged_df.columns:
                # 빈 값, 0, "미사용" 제거
                merged_df = merged_df[
                    (merged_df["EN (M)"].notna()) &
                    (merged_df["EN (M)"] != "") &
                    (merged_df["EN (M)"] != 0) &
                    (~merged_df["EN (M)"].astype(str).str.lower().eq("미사용"))
                ]

            # 7. 인덱스 재정렬
            merged_df.reset_index(drop=True, inplace=True)
            merged_df.insert(0, "#", range(1, len(merged_df) + 1))

            # 8. 출력 파일 저장
            today = datetime.now()
            output_filename = f"{today.month:02d}{today.day:02d}_MIR4_MASTER_DIALOGUE.xlsx"
            output_path = os.path.join(folder_path, output_filename)

            # Excel 저장 및 서식 적용
            with pd.ExcelWriter(output_path, engine="openpyxl") as writer:
                merged_df.to_excel(writer, index=False, sheet_name="Sheet1")
                ws = writer.sheets["Sheet1"]

                # 서식 적용
                self.formatter.apply_header_format(ws)
                self.formatter.apply_data_format(ws)
                self.formatter.freeze_panes(ws)

            return {
                "success": True,
                "output_file": output_path,
                "row_count": len(merged_df)
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
