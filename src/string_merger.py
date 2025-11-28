"""M4/GL STRING 병합"""
import os
import pandas as pd
from datetime import datetime
from src.excel_formatter import ExcelFormatter


class StringMerger:
    """STRING 테이블 병합 클래스"""

    # 파일별 열 매핑 (String ID, NOTE, KO, EN, CT, CS, JA, TH, ES-LATAM, PT-BR, NPC 이름, 비고)
    # PRD 3.2.2: 헤더 행과 데이터 시작 행은 실제 행 번호 (1-based)
    # pandas header는 0-based이므로: PRD 헤더 행 2 = pandas header=1
    FILE_COLUMN_MAPPINGS = {
        "SEQUENCE_DIALOGUE": {
            "header_row": 1, "data_start_row": 9,  # PRD: 헤더 2행, 데이터 9행
            "columns": [7, None, 10, 11, 12, 13, 14, 15, 16, 17, None, None]
        },
        "STRING_BUILTIN": {
            "header_row": 1, "data_start_row": 4,  # PRD: 헤더 2행, 데이터 4행
            "columns": [7, 21, 8, 9, 10, 11, 12, 13, 14, 15, None, None]
        },
        "STRING_MAIL": {
            "header_row": 1, "data_start_row": 4,  # PRD: 헤더 2행, 데이터 4행
            "columns": [7, None, 8, 9, 10, 11, 12, 13, 14, 15, None, None]
        },
        "STRING_MESSAGE": {
            "header_row": 1, "data_start_row": 4,  # PRD: 헤더 2행, 데이터 4행
            "columns": [7, 21, 8, 9, 10, 11, 12, 13, 14, 15, None, None]
        },
        "STRING_NPC": {
            "header_row": 1, "data_start_row": 4,  # PRD: 헤더 2행, 데이터 4행
            "columns": [7, 20, 9, 10, 11, 12, 13, 14, 15, 16, 18, 19]
        },
        "STRING_QUESTTEMPLATE": {
            "header_row": 1, "data_start_row": 7,  # PRD: 헤더 2행, 데이터 7행
            "columns": [7, 0, 12, 13, 14, 15, 16, 17, 18, 19, None, None]
        },
        "STRING_TEMPLATE": {
            "header_row": 1, "data_start_row": 4,  # PRD: 헤더 2행, 데이터 4행
            "columns": [7, 19, 8, 9, 10, 11, 12, 13, 14, 15, None, 18]
        },
        "STRING_TOOLTIP": {
            "header_row": 1, "data_start_row": 4,  # PRD: 헤더 2행, 데이터 4행
            "columns": [7, 8, 11, 12, 13, 14, 15, 16, 17, 18, None, None]
        },
    }

    OUTPUT_COLUMNS = [
        "#", "Table Name", "String ID", "Table/ID", "NOTE",
        "KO", "EN", "CT", "CS", "JA", "TH", "ES-LATAM", "PT-BR",
        "NPC 이름", "비고"
    ]

    def __init__(self):
        """StringMerger 초기화"""
        self.formatter = ExcelFormatter()

    def merge_string(self, folder_path):
        """STRING 파일 병합

        Args:
            folder_path: STRING 파일이 있는 폴더 경로

        Returns:
            dict: 병합 결과 (success, output_file, row_count)
        """
        try:
            # 필수 파일 검증
            required_files = list(self.FILE_COLUMN_MAPPINGS.keys())
            missing_files = []

            for filename in required_files:
                file_path = os.path.join(folder_path, f"{filename}.xlsm")
                if not os.path.exists(file_path):
                    missing_files.append(f"{filename}.xlsm")

            if missing_files:
                return {
                    "success": False,
                    "error": f"필요한 파일이 누락되었습니다: {', '.join(missing_files)}"
                }

            all_data = []

            # 8개 파일 읽기 및 병합
            for filename, config in self.FILE_COLUMN_MAPPINGS.items():
                file_path = os.path.join(folder_path, f"{filename}.xlsm")

                # 파일 읽기
                df = pd.read_excel(
                    file_path,
                    sheet_name=0,  # 첫 번째 시트
                    header=config["header_row"]
                )

                # 데이터 추출 (skiprows 계산)
                # header_row는 0-based, data_start_row는 실제 행 번호 (1-based)
                # 예: header_row=1 (2행), data_start_row=8 (8행) → skip 5 rows (3,4,5,6,7행)
                skip_after_header = config["data_start_row"] - config["header_row"] - 2
                if skip_after_header > 0:
                    df = df.iloc[skip_after_header:]

                # 열 매핑
                col_indices = config["columns"]

                for _, row in df.iterrows():
                    # 각 행 데이터 추출
                    try:
                        row_data = {
                            "Table Name": filename,
                            "String ID": row.iloc[col_indices[0]] if pd.notna(row.iloc[col_indices[0]]) else "",
                            "NOTE": row.iloc[col_indices[1]] if col_indices[1] is not None and pd.notna(row.iloc[col_indices[1]]) else "",
                            "KO": row.iloc[col_indices[2]] if pd.notna(row.iloc[col_indices[2]]) else "",
                            "EN": row.iloc[col_indices[3]] if pd.notna(row.iloc[col_indices[3]]) else "",
                            "CT": row.iloc[col_indices[4]] if pd.notna(row.iloc[col_indices[4]]) else "",
                            "CS": row.iloc[col_indices[5]] if pd.notna(row.iloc[col_indices[5]]) else "",
                            "JA": row.iloc[col_indices[6]] if pd.notna(row.iloc[col_indices[6]]) else "",
                            "TH": row.iloc[col_indices[7]] if pd.notna(row.iloc[col_indices[7]]) else "",
                            "ES-LATAM": row.iloc[col_indices[8]] if pd.notna(row.iloc[col_indices[8]]) else "",
                            "PT-BR": row.iloc[col_indices[9]] if pd.notna(row.iloc[col_indices[9]]) else "",
                            "NPC 이름": row.iloc[col_indices[10]] if col_indices[10] is not None and pd.notna(row.iloc[col_indices[10]]) else "",
                            "비고": row.iloc[col_indices[11]] if col_indices[11] is not None and pd.notna(row.iloc[col_indices[11]]) else "",
                        }
                        all_data.append(row_data)
                    except IndexError:
                        # 열이 없으면 건너뛰기
                        continue

            # DataFrame 생성
            merged_df = pd.DataFrame(all_data)

            # Table/ID 생성 (Table Name + "/" + String ID)
            merged_df["Table/ID"] = merged_df["Table Name"] + "/" + merged_df["String ID"].astype(str)

            # 인덱스 추가
            merged_df.insert(0, "#", range(1, len(merged_df) + 1))

            # 열 순서 조정
            merged_df = merged_df[self.OUTPUT_COLUMNS]

            # 출력 파일 저장
            today = datetime.now()
            output_filename = f"{today.month:02d}{today.day:02d}_MIR4_MASTER_STRING.xlsx"
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
