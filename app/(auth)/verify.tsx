import CustomButton from "@/components/CustomButton";
import CustomInput from "@/components/CustomInput";
import DropdownMenu from "@/components/DropdownMenu";

import { ImagePickerButton } from "@/components/ImagePickerButton";
import ImageUpload from "@/components/ImageUpload";
import Colors from "@/constants/Colors";
import { typography } from "@/constants/typograyph";
import { useRouter } from "expo-router";
import { IdCard, LocateFixed, MapPin, Phone } from "lucide-react-native";
import React, { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles } from "./styles";
const OPTIONS = [
  {
    label: "Japanese",
    value: "jp",
    icon: "🍱",
    description: "Sushi, ramen, tempura",
  },
  {
    label: "Italian",
    value: "it",
    icon: "🍝",
    description: "Pasta, risotto, pizza",
  },
  {
    label: "Mexican",
    value: "mx",
    icon: "🌮",
    description: "Tacos, enchiladas, mole",
  },
  {
    label: "Indian",
    value: "in",
    icon: "🍛",
    description: "Curry, biryani, dosa",
  },
  {
    label: "French",
    value: "fr",
    icon: "🥐",
    description: "Croissants, cassoulet",
  },
  {
    label: "Ethiopian",
    value: "et",
    icon: "🫓",
    description: "Injera, doro wat, kitfo",
  },
  { label: "Fusion (Disabled)", value: "fuse", disabled: true },
];

const Verify = () => {
  const [cuisine, setCuisine] = useState<string | null>(null);
  const router = useRouter();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [uploadDone, setUploadDone] = useState(false);
  return (
    <SafeAreaView style={styles.verifyStyle}>
      <ScrollView>
        <View>
          <Text
            style={{
              color: Colors.light.text,
              fontFamily: typography.medium,
              fontSize: 24,
              textAlign: "center",
              marginVertical: 16,
            }}
          >
            Student Verification
          </Text>
        </View>
        <View style={styles.inputView}>
          <CustomInput
            placeholder="Enter ID number"
            Icon={<IdCard size={19} color={"#000"} strokeWidth={1.5} />}
            keyboardType={true}
            label="Student ID number"
          />
          <CustomInput
            placeholder="Enter Reference number"
            Icon={<IdCard size={19} color={"#000"} strokeWidth={1.5} />}
            keyboardType={true}
            label="Student Reference number"
          />
          {imageUri && (
            <ImageUpload imageUri={imageUri} setDone={setUploadDone} />
          )}
          <ImagePickerButton setImage={setImageUri} disable={uploadDone} />
          {/* <CustomInput
            placeholder="Program of Study"
            Icon={<GraduationCap size={19} color={"#000"} strokeWidth={1.5} />}
            label=""
          /> */}
          <DropdownMenu
            label="Program of Study"
            options={OPTIONS}
            value={cuisine}
            placeholder="Choose a course…"
            onChange={(opt) => setCuisine(String(opt.value))}
          />
          <CustomInput
            placeholder="+1 (555) 000 0000"
            Icon={<Phone size={19} color={"#000"} strokeWidth={1.5} />}
            label="Active Phone number"
            keyboardType={true}
          />
          {/* <CustomInput
            placeholder="Name"
            Icon={<User size={19} color={"#000"} strokeWidth={1.5} />}
          /> */}
          <View style={styles.verifyLocationStyle}>
            {/* <CustomButton /> */}
            <DropdownMenu
              label="Location Type"
              options={OPTIONS}
              value={cuisine}
              placeholder="Pick a location type…"
              onChange={(opt) => setCuisine(String(opt.value))}
            />
            <CustomInput
              placeholder="Enter address"
              Icon={<MapPin size={20} color={Colors.light.accent} />}
              label="Address"
            />
            <CustomButton
              text={"Get Current Location"}
              onPress={() => {}}
              Icon={<LocateFixed size={20} color={Colors.dark.text} />}
            />
          </View>

          <CustomButton
            text={"Verify"}
            onPress={() => {
              router.navigate("/(auth)/verifyNumber");
              console.log("eh;lo");
            }}
          />
        </View>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "flex-end",
            marginVertical: 16,
          }}
        >
          <Text>{"You can "}</Text>
          <TouchableOpacity onPress={() => {}}>
            <Text style={{ color: Colors.light.accent }}>skip</Text>
          </TouchableOpacity>
          <Text>{" this and complete it later"}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Verify;
