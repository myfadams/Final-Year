import * as ImagePicker from "expo-image-picker";
import { Upload } from "lucide-react-native";
import { Alert, View } from "react-native";
import CustomButton from "./CustomButton";

interface ImagePickerButtonProp {
  setImage: React.Dispatch<React.SetStateAction<string | null>>;
  disable: boolean;
}

export const ImagePickerButton: React.FC<ImagePickerButtonProp> = ({
  setImage,
  disable,
}) => {
  const pickImage = async () => {
    // setImage(null);
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert(
        "Permission required",
        "Permission to access the media library is required.",
      );
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    console.log(result);

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  return (
    <View>
      <CustomButton
        text={"Upload ID"}
        onPress={pickImage}
        Icon={<Upload color={"#fff"} size={19} />}
        disabled={disable}
      />
    </View>
  );
};
