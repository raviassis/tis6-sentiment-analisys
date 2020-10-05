from sentistrength import PySentiStr
from pathlib import Path
path = Path().absolute().__str__().replace("\\", "/")
senti = PySentiStr()
senti.setSentiStrengthPath(path + "/SentiStrengthCom.jar")
senti.setSentiStrengthLanguageFolderPath(path + "/SentStrength_Data/")
str_arr = ['lovely and wonderful and amazing day.', 'You\'re in agony ']
result = senti.getSentiment(str_arr, score='scale')
print(result)